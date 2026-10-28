import { Node, type SourceFile, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.js';
import { editSource, ensureNamedImport } from '../wiring/ast.js';
import { bodyZod, enumNames, filterZod, responseType, rolesOf, type Roles } from './roles.js';
import type { Column, TableInfo } from './table.js';

/*
 * Brings a contract file in line with its table, editing it in place:
 * members that still match a column keep their text (custom validation,
 * comments), columns the contract lacks are added after the last column
 * member, and members of columns that left that part of the API are
 * removed. Members that aren't columns (addresses, createdBy…) stay.
 */

export interface SyncReport {
  /** "body: type", "Listed: type"… */
  added: string[];
  removed: string[];
  /** Members that match no column: kept, but maybe from a dropped column. */
  unknown: string[];
  /** Body fields added as required: tests and forms must send them. */
  required: string[];
  warnings: string[];
}

interface Member {
  name: string;
  text: string;
}

interface Wanted {
  name: string;
  /** Text for a new member. */
  text: string;
}

export function syncContract(
  path: string,
  source: string,
  names: ResourceNames,
  table: TableInfo,
  /** Columns just removed from the table: dropped from the contract too. */
  dropped: string[] = [],
): { content: string; report: SyncReport } {
  const report: SyncReport = { added: [], removed: [], unknown: [], required: [], warnings: [] };
  const { s, p } = names;
  const columns = table.columns.map((column) => ({ column, roles: rolesOf(column) }));
  const isColumn = new Set([...table.columns.map((c) => c.key), ...dropped]);
  const pick = (role: keyof Roles) => columns.filter((c) => c.roles[role]).map((c) => c.column);
  const api = columns.filter(({ roles }) => Object.values(roles).some(Boolean)).map((c) => c.column);
  const listedKeys = new Set(pick('listed').map((c) => c.key));
  const relations = new Set(table.relations);

  const step = (edit: (file: SourceFile) => void) => {
    source = editSource(path, source, edit);
  };
  const missing = (what: string) =>
    report.warnings.push(`${path}: "${what}" not found, so it wasn't synced.`);

  // Enum values, e.g. ACTIVITY_TYPES, before the body schema.
  for (const column of api.filter((c) => c.kind === 'enum')) {
    const { constant, type } = enumNames(names, column);
    const values = `[${column.enumValues!.map((v) => `'${v}'`).join(', ')}]`;
    step((file) => {
      const existing = file.getVariableDeclaration(constant);
      if (existing) {
        const array = existing.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
        if (array && array.getText() !== values) file.replaceText([array.getStart(), array.getEnd()], values);
        return;
      }
      const body = file.getVariableStatement(`${s.camel}BodySchema`);
      const at = body ? body.getStart(true) : file.getEnd();
      file.insertText(
        at,
        `/** Values of ${s.lower} ${column.key}. */\nexport const ${constant} = ${values} as const;\nexport type ${type} = (typeof ${constant})[number];\n\n`,
      );
      report.added.push(`${constant}`);
    });
  }

  // Body schema.
  step((file) => {
    const object = schemaObject(file, `${s.camel}BodySchema`);
    if (!object) return missing(`${s.camel}BodySchema`);
    const wanted = pick('body').map((column) => {
      const zod = bodyZod(names, column);
      return { name: column.key, text: `${column.key}: ${zod}` };
    });
    // Relations (e.g. addresses) can be part of the body too.
    const merged = merge('body', objectMembers(object), wanted, isColumn, report, { known: relations });
    for (const name of merged.added) {
      const column = table.columns.find((c) => c.key === name)!;
      if (column.notNull && !column.hasDefault) report.required.push(name);
    }
    replaceObject(file, object, merged.members);
  });

  // Sort and filter fields.
  syncFieldList(`${s.constant}_SORT_FIELDS`, pick('sort'));
  syncFieldList(`${s.constant}_FILTER_FIELDS`, pick('filter'));

  // Query string of the list: one param per filter.
  step((file) => {
    const object = schemaObject(file, `list${p.pascal}QuerySchema`);
    if (!object) return missing(`list${p.pascal}QuerySchema`);
    const filters = pick('filter');
    const wanted = filters.map((column) => ({
      name: column.key,
      text: `${column.key}: ${filterZod(names, column)}`,
    }));
    const members = objectMembers(object);
    // Only column-named members are filters; sortBy, limit… are left alone.
    const merged = merge('query', members, wanted, isColumn, report, { quietUnknown: true });
    replaceObject(file, object, merged.members);
  });

  // Response types.
  const member = (column: Column) => ({
    name: column.key,
    text: `${column.key}: ${responseType(names, column)};`,
  });
  syncInterface(`Listed${s.pascal}`, pick('listed').map(member), new Set());
  syncInterface(`${s.pascal}Detail`, pick('detail').map(member), relations, listedKeys);

  // Helpers the new body fields use.
  step((file) => {
    const text = file.getFullText();
    for (const helper of ['requiredText', 'optionalText'])
      if (text.includes(`${helper}(`)) ensureNamedImport(file, './common.ts', helper);
  });

  return { content: source, report };

  function syncFieldList(name: string, wantedColumns: Column[]) {
    step((file) => {
      const declaration = file.getVariableDeclaration(name);
      const array = declaration?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
      if (!array) return missing(name);
      const members = array.getElements().map((e) => ({
        name: Node.isStringLiteral(e) ? e.getLiteralValue() : e.getText(),
        text: e.getText(),
      }));
      const merged = merge(name, members, wantedColumns.map((c) => ({ name: c.key, text: `'${c.key}'` })), isColumn, report);
      file.replaceText([array.getStart(), array.getEnd()], `[${merged.members.join(', ')}]`);
    });
  }

  function syncInterface(name: string, wanted: Wanted[], known: Set<string>, inherited = new Set<string>()) {
    step((file) => {
      const iface = file.getInterface(name);
      if (!iface) return missing(name);
      const members = iface.getMembers().map((m) => ({
        name: Node.isPropertySignature(m) ? m.getName() : m.getText(),
        text: memberText(m),
      }));
      const merged = merge(name, members, wanted, isColumn, report, { known, inherited });
      const text = iface.getText();
      const open = iface.getStart() + text.indexOf('{', iface.getNameNode().getEnd() - iface.getStart());
      const body = merged.members.map((t) => (/[;,]$/.test(t) ? t : `${t};`)).join('\n');
      file.replaceText([open + 1, iface.getEnd() - 1], `\n${body}\n`);
    });
  }
}

/** The object passed to `z.strictObject({...})` / `z.object({...})`. */
function schemaObject(file: SourceFile, name: string) {
  return file
    .getVariableDeclaration(name)
    ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
}

function objectMembers(object: import('ts-morph').ObjectLiteralExpression): Member[] {
  return object.getProperties().map((prop) => ({
    name: Node.isSpreadAssignment(prop)
      ? `...${prop.getExpression().getText()}`
      : Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop)
        ? prop.getName()
        : prop.getText(),
    text: memberText(prop),
  }));
}

/** A member's text with its leading comments. */
function memberText(node: Node) {
  return node.getFullText().trim();
}

function replaceObject(file: SourceFile, object: import('ts-morph').ObjectLiteralExpression, members: string[]) {
  const body = members.map((m) => `${m},`).join('\n');
  file.replaceText([object.getStart() + 1, object.getEnd() - 1], members.length ? `\n${body}\n` : '');
}

/**
 * Keeps the existing members in order, dropping the column members that
 * aren't wanted any more, and adds the missing wanted ones after the last
 * column member (or after the leading spreads).
 */
function merge(
  where: string,
  existing: Member[],
  wanted: Wanted[],
  isColumn: Set<string>,
  report: SyncReport,
  options: { quietUnknown?: boolean; known?: Set<string>; inherited?: Set<string> } = {},
): { members: string[]; added: string[] } {
  const wantedNames = new Set(wanted.map((w) => w.name));
  const kept: Member[] = [];
  for (const member of existing) {
    if (wantedNames.has(member.name)) kept.push(member);
    else if (isColumn.has(member.name) && !options.inherited?.has(member.name)) {
      report.removed.push(`${where}: ${member.name}`);
    } else {
      kept.push(member);
      const explained =
        member.name.startsWith('...') ||
        options.known?.has(member.name) ||
        options.inherited?.has(member.name);
      if (!options.quietUnknown && !explained)
        report.unknown.push(`${where}: ${member.name}`);
    }
  }

  // `wanted` is in table order: put each new member right after the
  // column before it, or before the column after it, or after the spreads.
  const result = [...kept];
  const added: Wanted[] = [];
  wanted.forEach((w, index) => {
    if (result.some((m) => m.name === w.name)) return;
    const before = wanted.slice(0, index).map((x) => x.name);
    const after = wanted.slice(index + 1).map((x) => x.name);
    let at = -1;
    result.forEach((m, i) => {
      if (before.includes(m.name)) at = i + 1;
    });
    if (at === -1) {
      const next = result.findIndex((m) => after.includes(m.name));
      at = next !== -1 ? next : result.filter((m) => m.name.startsWith('...')).length;
    }
    result.splice(at, 0, w);
    added.push(w);
  });
  for (const w of added) report.added.push(`${where}: ${w.name}`);
  return { members: result.map((m) => m.text), added: added.map((w) => w.name) };
}

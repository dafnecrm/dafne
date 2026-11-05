import { Node, type ObjectLiteralExpression, type SourceFile, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.ts';
import { appendToList, editSource, insertListElement, removeListElement } from '../wiring/ast.ts';
import { rolesOf } from './roles.ts';
import type { TableInfo } from './table.ts';

/*
 * Brings the queries of a generated service (packages/backend/<plural>/src/<plural>.service.ts)
 * in line with the table and its @api tags, editing only what they're about:
 * - list<P>: the `db.select({...})` fields are the listed columns;
 * - get<S>: `findFirst({ columns: {...} })` leaves out (`key: false`) the
 *   columns that aren't in the response;
 * - create<S> / update<S>: `values({...})` / `set({...})` save the body's
 *   fields (`key: body.key`).
 * Anything else (ids, dates, users, hand-written logic) stays as it is.
 */

export interface ServiceReport {
  added: string[];
  removed: string[];
  warnings: string[];
}

interface Section {
  /** Where the object is, for messages: a method (listActivities) or a function. */
  method: string;
  /** Finds the object literal to edit. */
  locate: (file: SourceFile) => ObjectLiteralExpression | undefined;
  /** Not finding it isn't worth a warning (nothing would change anyway). */
  optional?: boolean;
  /** The members this section manages: key → whether it belongs to it. */
  owns: (key: string, value: string) => boolean;
  /** Keys that should be there, in table order, with their text. */
  wanted: { key: string; text: string }[];
  label: string;
}

/** The object passed to the first `.<name>(...)` call in the method. */
const callArgument = (name: string) => (method: Node) =>
  method
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((c) => {
      const callee = c.getExpression();
      return Node.isPropertyAccessExpression(callee) && callee.getName() === name;
    })
    ?.getArguments()[0]
    ?.asKind(SyntaxKind.ObjectLiteralExpression);

/** `columns: {...}` inside the `findFirst({...})` of the method. */
const findFirstColumns = (method: Node) => {
  const options = callArgument('findFirst')(method);
  const columns = options?.getProperty('columns');
  return columns && Node.isPropertyAssignment(columns)
    ? columns.getInitializer()?.asKind(SyntaxKind.ObjectLiteralExpression)
    : undefined;
};

const keyOf = (prop: Node) =>
  Node.isPropertyAssignment(prop) || Node.isShorthandPropertyAssignment(prop) ? prop.getName() : undefined;
const valueOf = (prop: Node) => (Node.isPropertyAssignment(prop) ? prop.getInitializerOrThrow().getText() : '');

export function syncService(
  path: string,
  source: string,
  names: ResourceNames,
  table: TableInfo,
  /** Columns just removed from the table. */
  dropped: string[] = [],
): { content: string; report: ServiceReport } {
  const report: ServiceReport = { added: [], removed: [], warnings: [] };
  const { s, p } = names;
  const record = table.variable;
  const columns = table.columns.map((column) => ({ column, roles: rolesOf(column) }));
  const isColumn = new Set([...table.columns.map((c) => c.key), ...dropped]);
  const keys = (pick: (r: ReturnType<typeof rolesOf>) => boolean) =>
    columns.filter(({ roles }) => pick(roles)).map(({ column }) => column.key);

  const listed = keys((r) => r.listed);
  const body = keys((r) => r.body);
  // Not in the response: left out of findFirst. createdById/updatedById are
  // already there in the generated services.
  const hidden = keys((r) => !r.listed && !r.detail);

  const inMethod = (method: string, find: (method: Node) => ObjectLiteralExpression | undefined) => (file: SourceFile) => {
    const found = file.getClass(`${p.pascal}Service`)?.getMethod(method);
    return found && find(found);
  };
  const sections: Section[] = [
    {
      method: `list${p.pascal}`,
      locate: inMethod(`list${p.pascal}`, callArgument('select')),
      owns: (key, value) => isColumn.has(key) && value === `${record}.${key}`,
      wanted: listed.map((key) => ({ key, text: `${key}: ${record}.${key}` })),
      label: 'select',
    },
    {
      method: `get${s.pascal}`,
      locate: inMethod(`get${s.pascal}`, findFirstColumns),
      owns: (key, value) => isColumn.has(key) && value === 'false',
      wanted: hidden.map((key) => ({ key, text: `${key}: false` })),
      label: 'findFirst columns',
    },
    {
      method: `create${s.pascal}`,
      locate: inMethod(`create${s.pascal}`, callArgument('values')),
      owns: (key, value) => isColumn.has(key) && value === `body.${key}`,
      wanted: body.map((key) => ({ key, text: `${key}: body.${key}` })),
      label: 'insert values',
    },
    {
      method: `update${s.pascal}`,
      locate: inMethod(`update${s.pascal}`, callArgument('set')),
      owns: (key, value) => isColumn.has(key) && value === `body.${key}`,
      wanted: body.map((key) => ({ key, text: `${key}: body.${key}` })),
      label: 'update set',
    },
  ];

  source = applySections(path, source, sections, report, `${p.pascal}Service.`);
  return { content: source, report };
}

/**
 * The service parts of a child table (see syncChildContract), reached from
 * the parent through `relation` (e.g. addresses → customerAddress):
 * - get<S>: `with: { <relation>: { columns: {...} } }` leaves out the
 *   columns that aren't in the response;
 * - the insert: `.insert(<child>).values(<list>.map((item…) => ({...})))`
 *   saves the body's fields (`key: item.key`).
 */
export function syncChildService(
  path: string,
  source: string,
  names: ResourceNames,
  child: TableInfo,
  relation: string,
  roles: (column: TableInfo['columns'][number]) => ReturnType<typeof rolesOf>,
  dropped: string[] = [],
): { content: string; report: ServiceReport } {
  const report: ServiceReport = { added: [], removed: [], warnings: [] };
  const { s, p } = names;
  const isColumn = new Set([...child.columns.map((c) => c.key), ...dropped]);
  const keys = (pick: (r: ReturnType<typeof rolesOf>) => boolean) => child.columns.filter((c) => pick(roles(c))).map((c) => c.key);
  // Not in the response: left out of the relation's columns.
  const hidden = keys((r) => !r.listed && !r.detail);
  const body = keys((r) => r.body);

  // The arrow function inside `.insert(<child>).values(...)`, and its item.
  const insertMap = (file: SourceFile) => {
    for (const call of file.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const callee = call.getExpression();
      if (!Node.isPropertyAccessExpression(callee) || callee.getName() !== 'values') continue;
      const target = callee.getExpression();
      if (!Node.isCallExpression(target) || target.getArguments()[0]?.getText() !== child.variable) continue;
      const arrow = call.getArguments()[0]?.getFirstDescendantByKind(SyntaxKind.ArrowFunction);
      const item = arrow?.getParameters()[0]?.getName();
      const object = arrow?.getBody().asKind(SyntaxKind.ParenthesizedExpression)?.getExpression().asKind(SyntaxKind.ObjectLiteralExpression);
      if (item && object) return { item, object };
    }
    return undefined;
  };
  const item = editSourceValue(path, source, (file) => insertMap(file)?.item);

  const sections: Section[] = [
    {
      method: `get${s.pascal}`,
      locate: (file) => {
        const method = file.getClass(`${p.pascal}Service`)?.getMethod(`get${s.pascal}`);
        const options = method && callArgument('findFirst')(method);
        const withs = options?.getProperty('with');
        const entry = withs && Node.isPropertyAssignment(withs) ? withs.getInitializer()?.asKind(SyntaxKind.ObjectLiteralExpression)?.getProperty(relation) : undefined;
        const config = entry && Node.isPropertyAssignment(entry) ? entry.getInitializer()?.asKind(SyntaxKind.ObjectLiteralExpression) : undefined;
        const columns = config?.getProperty('columns');
        return columns && Node.isPropertyAssignment(columns) ? columns.getInitializer()?.asKind(SyntaxKind.ObjectLiteralExpression) : undefined;
      },
      optional: !hidden.length,
      owns: (key, value) => isColumn.has(key) && value === 'false',
      wanted: hidden.map((key) => ({ key, text: `${key}: false` })),
      label: `with ${relation} columns`,
    },
    ...(item
      ? [
          {
            method: `insert ${child.variable}`,
            locate: (file: SourceFile) => insertMap(file)?.object,
            owns: (key: string, value: string) => value === `${item}.${key}`,
            wanted: body.map((key) => ({ key, text: `${key}: ${item}.${key}` })),
            label: 'values',
          },
        ]
      : []),
  ];
  if (!item) report.warnings.push(`${path}: no .insert(${child.variable}).values(list.map(...)); update the ${relation} insert by hand.`);
  source = applySections(path, source, sections, report, '', isColumn);
  return { content: source, report };
}

/** Reads something from the file without changing it. */
function editSourceValue<T>(path: string, source: string, read: (file: SourceFile) => T): T {
  let value!: T;
  editSource(path, source, (file) => {
    value = read(file);
  });
  return value;
}

/**
 * Removes the members a section owns that aren't wanted, then adds the
 * missing wanted ones in table order. `isColumn` tells, for a member the
 * section owns but doesn't want, whether it's a column (removed) or not
 * (kept, and reported: maybe a dropped or renamed column).
 */
function applySections(path: string, source: string, sections: Section[], report: ServiceReport, owner: string, isColumn?: Set<string>): string {
  for (const section of sections) {
    const locate = section.locate;
    let found = true;
    // Removals first, then additions; each step re-parses.
    for (;;) {
      let removedOne = false;
      source = editSource(path, source, (file) => {
        const object = locate(file);
        if (!object) {
          found = false;
          return;
        }
        const wantedKeys = new Set(section.wanted.map((w) => w.key));
        const stale = object.getProperties().find((prop) => {
          const key = keyOf(prop);
          return key !== undefined && section.owns(key, valueOf(prop)) && !wantedKeys.has(key) && (!isColumn || isColumn.has(key));
        });
        if (stale) {
          report.removed.push(`${section.method} ${section.label}: ${keyOf(stale)}`);
          removeListElement(file, object.getProperties(), stale);
          removedOne = true;
        }
      });
      if (!found || !removedOne) break;
    }
    if (!found) {
      if (!section.optional) report.warnings.push(`${path}: no ${section.label} in ${owner}${section.method}; update it by hand.`);
      continue;
    }
    if (isColumn)
      source = editSource(path, source, (file) => {
        for (const prop of locate(file)!.getProperties()) {
          const key = keyOf(prop);
          if (key !== undefined && section.owns(key, valueOf(prop)) && !isColumn.has(key))
            report.warnings.push(`${path}: ${owner}${section.method} ${section.label}: ${key} isn't a column of the table: kept. Remove it if the column was dropped or renamed.`);
        }
      });

    source = editSource(path, source, (file) => {
      for (const [index, want] of section.wanted.entries()) {
        const object = locate(file)!;
        const props = object.getProperties();
        const present = props.map(keyOf);
        // A key already set to something else (e.g. a computed value) is left alone.
        if (present.includes(want.key)) continue;
        // After the wanted key before it, else before the one after it, else
        // first (no field there yet: they go before createdAt, updatedById…).
        const before = section.wanted.slice(0, index).map((w) => w.key).reverse().find((k) => present.includes(k));
        const after = section.wanted.slice(index + 1).map((w) => w.key).find((k) => present.includes(k));
        const at = before !== undefined ? present.indexOf(before) + 1 : after !== undefined ? present.indexOf(after) : 0;
        if (at >= props.length) appendToList(file, object, props, want.text);
        else if (at === 0) {
          const first = props[0];
          const text = file.getFullText();
          const multiline = text.slice(object.getStart(), first.getStart()).includes('\n');
          const indent = /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', first.getStart() - 1) + 1))![0];
          file.insertText(first.getStart(), multiline ? `${want.text},\n${indent}` : `${want.text}, `);
        } else insertListElement(file, props, at, want.text);
        report.added.push(`${section.method} ${section.label}: ${want.key}`);
      }
    });
  }
  return source;
}

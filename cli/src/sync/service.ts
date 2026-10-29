import { Node, type ObjectLiteralExpression, type SourceFile, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.js';
import { appendToList, editSource, insertListElement, removeListElement } from '../wiring/ast.js';
import { rolesOf } from './roles.js';
import type { TableInfo } from './table.js';

/*
 * Brings the queries of a generated service (libs/<plural>/src/<plural>.service.ts)
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
  /** The method, e.g. listActivities. */
  method: string;
  /** Finds the object literal to edit inside the method. */
  find: (method: Node) => ObjectLiteralExpression | undefined;
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

  const sections: Section[] = [
    {
      method: `list${p.pascal}`,
      find: callArgument('select'),
      owns: (key, value) => isColumn.has(key) && value === `${record}.${key}`,
      wanted: listed.map((key) => ({ key, text: `${key}: ${record}.${key}` })),
      label: 'select',
    },
    {
      method: `get${s.pascal}`,
      find: findFirstColumns,
      owns: (key, value) => isColumn.has(key) && value === 'false',
      wanted: hidden.map((key) => ({ key, text: `${key}: false` })),
      label: 'findFirst columns',
    },
    {
      method: `create${s.pascal}`,
      find: callArgument('values'),
      owns: (key, value) => isColumn.has(key) && value === `body.${key}`,
      wanted: body.map((key) => ({ key, text: `${key}: body.${key}` })),
      label: 'insert values',
    },
    {
      method: `update${s.pascal}`,
      find: callArgument('set'),
      owns: (key, value) => isColumn.has(key) && value === `body.${key}`,
      wanted: body.map((key) => ({ key, text: `${key}: body.${key}` })),
      label: 'update set',
    },
  ];

  for (const section of sections) {
    const locate = (file: SourceFile) => {
      const method = file.getClass(`${p.pascal}Service`)?.getMethod(section.method);
      return method && section.find(method);
    };
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
          return key !== undefined && section.owns(key, valueOf(prop)) && !wantedKeys.has(key);
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
      report.warnings.push(`${path}: no ${section.label} in ${p.pascal}Service.${section.method}; update it by hand.`);
      continue;
    }

    source = editSource(path, source, (file) => {
      for (const [index, want] of section.wanted.entries()) {
        const object = locate(file)!;
        const props = object.getProperties();
        const present = props.map(keyOf);
        // A key already set to something else (e.g. a computed value) is left alone.
        if (present.includes(want.key)) continue;
        // After the wanted key before it, else before the one after it, else last.
        const before = section.wanted.slice(0, index).map((w) => w.key).reverse().find((k) => present.includes(k));
        const after = section.wanted.slice(index + 1).map((w) => w.key).find((k) => present.includes(k));
        const at = before !== undefined ? present.indexOf(before) + 1 : after !== undefined ? present.indexOf(after) : props.length;
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
  return { content: source, report };
}

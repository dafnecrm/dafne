import { Node, type ObjectLiteralExpression, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.js';
import { editSource } from '../wiring/ast.js';

export type ColumnKind =
  | 'string'
  | 'text'
  | 'int'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'enum'
  | 'json'
  | 'unknown';

/** `@api` tags, written in a comment above the column. */
export const API_TAGS = [
  'internal', // never in the API
  'readonly', // in responses, not in the body
  'writeonly', // in the body only
  'detail', // in the detail response, not in the list
  'filter',
  'nofilter',
  'sort',
  'nosort',
] as const;
export type ApiTag = (typeof API_TAGS)[number];

export interface Column {
  /** Property name, e.g. createdAt. */
  key: string;
  /** Drizzle builder, e.g. varchar. */
  builder: string;
  kind: ColumnKind;
  notNull: boolean;
  primaryKey: boolean;
  length?: number;
  enumValues?: string[];
  /** Dates (or bigints) read as strings. */
  stringMode: boolean;
  /** Filled by the database or Drizzle (defaultNow, $onUpdate, autoincrement…). */
  serverManaged: boolean;
  /** Has `.default(...)`: the body may leave it out. */
  hasDefault: boolean;
  references: boolean;
  tags: Set<ApiTag>;
}

export interface TableInfo {
  /** The Drizzle table variable, e.g. activity. */
  variable: string;
  columns: Column[];
  /** Relation names of the table (createdBy, addresses…). */
  relations: string[];
  warnings: string[];
}

const KINDS: Record<string, ColumnKind> = {
  varchar: 'string',
  char: 'string',
  binary: 'string',
  varbinary: 'string',
  time: 'string',
  text: 'text',
  tinytext: 'text',
  mediumtext: 'text',
  longtext: 'text',
  int: 'int',
  tinyint: 'int',
  smallint: 'int',
  mediumint: 'int',
  serial: 'int',
  year: 'int',
  bigint: 'int',
  float: 'float',
  double: 'float',
  real: 'float',
  decimal: 'decimal',
  boolean: 'boolean',
  timestamp: 'datetime',
  datetime: 'datetime',
  date: 'date',
  json: 'json',
  mysqlEnum: 'enum',
};

const SERVER_MANAGED = new Set([
  'defaultNow',
  '$onUpdate',
  '$onUpdateFn',
  '$defaultFn',
  '$default',
  'autoincrement',
]);

/** Reads the columns of the resource's table (`<singular> = mysqlTable(...)`). */
export function readTable(path: string, source: string, { s }: ResourceNames): TableInfo {
  let info: TableInfo | undefined;
  editSource(path, source, (file) => {
    const declaration = file.getVariableDeclaration(s.camel);
    const call = declaration?.getInitializerIfKind(SyntaxKind.CallExpression);
    if (!call || !/Table$/.test(call.getExpression().getText()))
      throw new Error(`No "export const ${s.camel} = mysqlTable(...)" found in ${path}.`);
    const columnsArg = call.getArguments()[1];
    if (!columnsArg || !Node.isObjectLiteralExpression(columnsArg))
      throw new Error(`The columns of ${s.camel} in ${path} aren't an object literal.`);

    const warnings: string[] = [];
    const columns: Column[] = [];
    for (const prop of columnsArg.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) {
        warnings.push(`${path}: skipped "${prop.getText().slice(0, 40)}" (not a plain column).`);
        continue;
      }
      const column = readColumn(prop.getName(), prop.getInitializerOrThrow(), warnings, path);
      column.tags = readTags(prop, warnings, path);
      columns.push(column);
    }
    info = { variable: s.camel, columns, relations: readRelations(file, s.camel), warnings };
  });
  return info!;
}

function readColumn(key: string, init: Node, warnings: string[], path: string): Column {
  const methods: string[] = [];
  let builder = '';
  let args: Node[] = [];
  let node: Node = init;
  for (;;) {
    if (!Node.isCallExpression(node)) break;
    const callee = node.getExpression();
    if (Node.isPropertyAccessExpression(callee)) {
      methods.push(callee.getName());
      node = callee.getExpression();
    } else {
      builder = callee.getText();
      args = node.getArguments();
      break;
    }
  }

  const column: Column = {
    key,
    builder,
    kind: KINDS[builder] ?? 'unknown',
    notNull: methods.includes('notNull') || methods.includes('primaryKey'),
    primaryKey: methods.includes('primaryKey'),
    stringMode: false,
    serverManaged: methods.some((m) => SERVER_MANAGED.has(m)) || builder === 'serial',
    hasDefault: methods.includes('default'),
    references: methods.includes('references'),
    tags: new Set(),
  };
  if (column.kind === 'unknown')
    warnings.push(`${path}: "${key}" uses ${builder || 'an unknown builder'}, which the CLI doesn't map; it's left out of the contract.`);

  for (const arg of args) {
    if (Node.isArrayLiteralExpression(arg))
      column.enumValues = arg
        .getElements()
        .filter(Node.isStringLiteral)
        .map((e) => e.getLiteralValue());
    if (Node.isObjectLiteralExpression(arg)) readConfig(column, arg, warnings, path);
  }
  if (column.kind === 'enum' && !column.enumValues?.length) {
    warnings.push(`${path}: "${key}" is an enum without literal values; it's left out of the contract.`);
    column.kind = 'unknown';
  }
  if (builder === 'bigint' && !column.stringMode) column.kind = 'int';
  if (column.kind === 'string' && column.length === undefined && builder === 'varchar')
    warnings.push(`${path}: "${key}" has no length; the contract uses 255.`);
  return column;
}

function readConfig(column: Column, config: ObjectLiteralExpression, warnings: string[], path: string) {
  for (const prop of config.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const name = prop.getName();
    const value = prop.getInitializer();
    if (name === 'length' && value && Node.isNumericLiteral(value))
      column.length = value.getLiteralValue();
    else if (name === 'mode' && value && Node.isStringLiteral(value))
      column.stringMode = value.getLiteralValue() === 'string';
    else if (name === 'enum' && value && Node.isArrayLiteralExpression(value)) {
      column.kind = 'enum';
      column.enumValues = value.getElements().filter(Node.isStringLiteral).map((e) => e.getLiteralValue());
    } else if (!['fsp', 'unsigned', 'precision', 'scale', 'onUpdate'].includes(name))
      warnings.push(`${path}: "${column.key}" has an unknown option "${name}"${name === 'lenght' ? ' (did you mean "length"?)' : ''}.`);
  }
}

function readTags(prop: Node, warnings: string[], path: string): Set<ApiTag> {
  const tags = new Set<ApiTag>();
  const comments = prop
    .getLeadingCommentRanges()
    .map((range) => range.getText())
    .join('\n');
  for (const match of comments.matchAll(/@api\b([^\n*]*)/g))
    for (const word of match[1].trim().split(/[\s,]+/).filter(Boolean)) {
      if ((API_TAGS as readonly string[]).includes(word)) tags.add(word as ApiTag);
      else warnings.push(`${path}: unknown tag "@api ${word}"; use ${API_TAGS.join(', ')}.`);
    }
  return tags;
}

/** Names under `<table>: { ... }` in the file's defineRelationsPart. */
function readRelations(file: import('ts-morph').SourceFile, table: string): string[] {
  const relations = file.getVariableDeclaration(`${table}Relations`);
  if (!relations) return [];
  for (const prop of relations.getDescendantsOfKind(SyntaxKind.PropertyAssignment)) {
    const init = prop.getInitializer();
    if (prop.getName() === table && init && Node.isObjectLiteralExpression(init))
      return init.getProperties().flatMap((p) => (Node.isPropertyAssignment(p) ? [p.getName()] : []));
  }
  return [];
}

import {
  type ArrayLiteralExpression,
  type CallExpression,
  Node,
  type ObjectLiteralExpression,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph';
import {
  appendToList,
  editSource,
  ensureNamedImport,
  insertImportLine,
  removeListElement,
  removeUnusedImports,
} from '../wiring/ast.ts';

/*
 * Edits one Drizzle table file (packages/backend/database/src/tables/<plural>.ts) as
 * text: each method re-parses it, so nodes are never stale.
 */

export class TableFile {
  readonly path: string;
  source: string;

  constructor(path: string, source: string) {
    this.path = path;
    this.source = source;
  }

  private edit(change: (file: SourceFile) => void) {
    this.source = editSource(this.path, this.source, change);
  }

  private read<T>(get: (file: SourceFile) => T): T {
    let value!: T;
    editSource(this.path, this.source, (file) => {
      value = get(file);
    });
    return value;
  }

  /** Names of the tables declared in the file (`export const x = mysqlTable(...)`). */
  tables(): string[] {
    return this.read((file) =>
      file
        .getVariableDeclarations()
        .filter((d) => /Table$/.test(d.getInitializerIfKind(SyntaxKind.CallExpression)?.getExpression().getText() ?? ''))
        .map((d) => d.getName()),
    );
  }

  /** Column names of a table, in order. */
  columnKeys(table: string): string[] {
    return this.read((file) =>
      columns(file, table)
        .getProperties()
        .flatMap((p) => (Node.isPropertyAssignment(p) ? [p.getName()] : [])),
    );
  }

  /** Every `<table>: { ... }` relation in the file's parts: name → config. */
  allRelations(table: string): Record<string, string> {
    const all: Record<string, string> = {};
    for (const variable of this.tables()) {
      const part = `${variable}Relations`;
      if (this.hasRelationsPart(part)) Object.assign(all, this.relations(part, table));
    }
    return all;
  }

  hasColumn(table: string, key: string): boolean {
    return this.read((file) => columns(file, table).getProperty(key) !== undefined);
  }

  /** Text of a column's builder, e.g. "varchar('id', { length: 36 }).primaryKey()". */
  columnCode(table: string, key: string): string | undefined {
    return this.read((file) => {
      const prop = columns(file, table).getProperty(key);
      return prop && Node.isPropertyAssignment(prop) ? prop.getInitializerOrThrow().getText() : undefined;
    });
  }

  ensureImport(module: string, name: string) {
    this.edit((file) => ensureNamedImport(file, module, name));
  }

  /** Inserts `key: code` after `after`, or before createdAt, or last. */
  addColumn(table: string, key: string, code: string, comment = '', after?: string) {
    this.edit((file) => {
      const object = columns(file, table);
      if (object.getProperty(key)) throw new Error(`${this.path}: ${table} already has a "${key}" column.`);
      const props = object.getProperties();
      let index: number;
      if (after) {
        index = props.findIndex((p) => Node.isPropertyAssignment(p) && p.getName() === after);
        if (index === -1) throw new Error(`${this.path}: no "${after}" column to put the new one after.`);
        index += 1;
      } else {
        index = props.findIndex((p) => Node.isPropertyAssignment(p) && p.getName() === 'createdAt');
        if (index === -1) index = props.length;
      }
      const text = `${comment}${key}: ${code}`;
      if (index >= props.length) {
        const indent = props.length ? indentOf(file, lineStart(file, props[props.length - 1])) : '    ';
        appendToList(file, object, props, text.replace(/\n/g, `\n${indent}`));
        return;
      }
      const at = lineStart(file, props[index]);
      const indent = indentOf(file, at);
      file.insertText(at + indent.length, `${text.replace(/\n/g, `\n${indent}`)},\n${indent}`);
    });
  }

  removeColumn(table: string, key: string) {
    this.edit((file) => {
      const object = columns(file, table);
      const prop = object.getProperty(key);
      if (!prop) throw new Error(`${this.path}: ${table} has no "${key}" column.`);
      removeListElement(file, object.getProperties(), prop);
    });
    // Indexes and keys on that column.
    this.edit((file) => {
      const array = extraConfig(file, table);
      if (!array) return;
      const uses = new RegExp(`\\b\\w+\\.${key}\\b`);
      for (;;) {
        const current = extraConfig(file, table)!;
        const element = current.getElements().find((e) => uses.test(e.getText()));
        if (!element) return;
        removeListElement(file, current.getElements(), element);
      }
    });
  }

  /** Adds `index('<sql>_<key>_idx').on(table.<key>)` to the table's extra config. */
  addIndex(table: string, sqlTable: string, key: string) {
    this.ensureImport('drizzle-orm/mysql-core', 'index');
    const element = (param: string) => `index('${sqlTable}_${key}_idx').on(${param}.${key})`;
    this.edit((file) => {
      const array = extraConfig(file, table);
      if (array) {
        const param = extraConfigParam(file, table);
        const text = element(param);
        if (!array.getElements().some((e) => e.getText() === text)) appendToList(file, array, array.getElements(), text);
        return;
      }
      const call = tableCall(file, table);
      appendToList(file, call, call.getArguments(), `(table) => [${element('table')}]`);
    });
  }

  /** Adds a whole table statement before the relations (or at the end). */
  addStatement(code: string, before?: string) {
    this.edit((file) => {
      const target = before ? file.getVariableStatement(before) : undefined;
      if (target) file.insertText(target.getStart(true), `${code}\n\n`);
      else file.insertText(file.getEnd(), `\n${code}\n`);
    });
  }

  removeStatement(variable: string) {
    this.edit((file) => {
      const statement = file.getVariableStatement(variable);
      if (!statement) return;
      const text = file.getFullText();
      let end = statement.getEnd();
      while (text[end] === '\n') end++;
      file.removeText(statement.getStart(true), end);
    });
  }

  /* ---------- Relations: `export const <x>Relations = defineRelationsPart({...}, (r) => ({...}))` ---------- */

  hasRelationsPart(part: string) {
    return this.read((file) => file.getVariableDeclaration(part) !== undefined);
  }

  /** Makes `name` available in the part's tables object (`{ user, activity }`). */
  ensurePartTable(part: string, name: string) {
    this.edit((file) => {
      const object = partTables(file, part);
      const has = object.getProperties().some((p) => {
        if (Node.isShorthandPropertyAssignment(p) || Node.isPropertyAssignment(p)) return p.getName() === name;
        return false;
      });
      if (!has) appendToList(file, object, object.getProperties(), name);
    });
  }

  /** Adds `relation: code` under `table` in the part, creating `table: {}` if missing. */
  addRelation(part: string, table: string, relation: string, code: string) {
    this.edit((file) => {
      const config = partConfig(file, part);
      if (!config.getProperty(table)) appendToList(file, config, config.getProperties(), `${table}: {}`);
    });
    this.edit((file) => {
      const tableConfig = relationTable(file, part, table)!;
      if (tableConfig.getProperty(relation))
        throw new Error(`${this.path}: ${table} already has a "${relation}" relation.`);
      const props = tableConfig.getProperties();
      if (props.length) appendToList(file, tableConfig, props, `${relation}: ${code}`);
      else {
        const indent = indentOf(file, lineStart(file, tableConfig.getParentOrThrow()));
        file.replaceText([tableConfig.getStart(), tableConfig.getEnd()], `{\n${indent}  ${relation}: ${code},\n${indent}}`);
      }
    });
  }

  /**
   * Removes every relation in the part whose config matches `uses` (e.g. a
   * column or a junction table), then empty table entries. Returns the
   * removed "table.relation" names.
   */
  removeRelations(part: string, uses: RegExp): string[] {
    const removed: string[] = [];
    for (;;) {
      const found = this.read((file) => {
        for (const tableProp of partConfig(file, part).getProperties()) {
          if (!Node.isPropertyAssignment(tableProp)) continue;
          const init = tableProp.getInitializer();
          if (!init || !Node.isObjectLiteralExpression(init)) continue;
          for (const rel of init.getProperties())
            if (Node.isPropertyAssignment(rel) && uses.test(rel.getInitializerOrThrow().getText()))
              return { table: tableProp.getName(), relation: rel.getName() };
        }
        return undefined;
      });
      if (!found) break;
      removed.push(`${found.table}.${found.relation}`);
      this.edit((file) => {
        const tableConfig = relationTable(file, part, found.table)!;
        removeListElement(file, tableConfig.getProperties(), tableConfig.getPropertyOrThrow(found.relation));
      });
    }
    // Drop the entries left empty, except the part's own table.
    const own = part.replace(/Relations$/, '');
    this.edit((file) => {
      for (;;) {
        const config = partConfig(file, part);
        const empty = config.getProperties().find((p) => {
          if (!Node.isPropertyAssignment(p) || p.getName() === own) return false;
          const init = p.getInitializer();
          return init && Node.isObjectLiteralExpression(init) && init.getProperties().length === 0;
        });
        if (!empty) return;
        removeListElement(file, config.getProperties(), empty);
      }
    });
    return removed;
  }

  /** Relations of `table` in the part: name → config text. */
  relations(part: string, table: string): Record<string, string> {
    return this.read((file) => {
      const config = relationTable(file, part, table);
      if (!config) return {};
      return Object.fromEntries(
        config
          .getProperties()
          .filter(Node.isPropertyAssignment)
          .map((p) => [p.getName(), p.getInitializerOrThrow().getText()]),
      );
    });
  }

  /** Removes tables the part's callback no longer uses from its tables object. */
  pruneUnusedPartTables(part: string) {
    for (;;) {
      const unused = this.read((file) => {
        const call = partCall(file, part);
        const callback = call.getArguments()[1]?.getText() ?? '';
        const own = part.replace(/Relations$/, '');
        return partTables(file, part)
          .getProperties()
          .map((p) => (Node.isShorthandPropertyAssignment(p) || Node.isPropertyAssignment(p) ? p.getName() : ''))
          .find((name) => name && name !== own && !new RegExp(`\\br\\.(one\\.|many\\.)?${name}\\b`).test(callback));
      });
      if (!unused) return;
      this.edit((file) => {
        const object = partTables(file, part);
        const prop = object.getProperties().find((p) => (p as { getName?: () => string }).getName?.() === unused)!;
        removeListElement(file, object.getProperties(), prop);
      });
    }
  }

  /** Drops imports from drizzle and other table files that are no longer used. */
  pruneImports() {
    this.edit((file) =>
      removeUnusedImports(file, (m) => m.startsWith('drizzle-orm') || /^\.\/[\w-]+\.js$/.test(m)),
    );
  }

  /** Adds `import { name } from './file.ts'` for a table in another file. */
  importTable(name: string, module: string) {
    this.edit((file) => {
      const declared = file.getVariableDeclaration(name);
      if (declared) return;
      const existing = file.getImportDeclaration((d) => d.getModuleSpecifierValue() === module);
      if (existing) ensureNamedImport(file, module, name);
      else insertImportLine(file, `{ ${name} }`, module);
    });
  }
}

/* ---------- Node lookups ---------- */

function tableCall(file: SourceFile, table: string): CallExpression {
  const call = file.getVariableDeclaration(table)?.getInitializerIfKind(SyntaxKind.CallExpression);
  if (!call) throw new Error(`${file.getBaseName()}: no "${table} = mysqlTable(...)".`);
  return call;
}

function columns(file: SourceFile, table: string): ObjectLiteralExpression {
  const arg = tableCall(file, table).getArguments()[1];
  if (!arg || !Node.isObjectLiteralExpression(arg))
    throw new Error(`${file.getBaseName()}: the columns of ${table} aren't an object literal.`);
  return arg;
}

/** The array returned by `(table) => [...]`, the table's indexes and keys. */
function extraConfig(file: SourceFile, table: string): ArrayLiteralExpression | undefined {
  const arg = tableCall(file, table).getArguments()[2];
  if (!arg || !Node.isArrowFunction(arg)) return undefined;
  const body = arg.getBody();
  const array = Node.isParenthesizedExpression(body) ? body.getExpression() : body;
  return Node.isArrayLiteralExpression(array) ? array : undefined;
}

function extraConfigParam(file: SourceFile, table: string): string {
  const arg = tableCall(file, table).getArguments()[2];
  return arg && Node.isArrowFunction(arg) ? (arg.getParameters()[0]?.getName() ?? 'table') : 'table';
}

function partCall(file: SourceFile, part: string): CallExpression {
  const call = file.getVariableDeclaration(part)?.getInitializerIfKind(SyntaxKind.CallExpression);
  if (!call) throw new Error(`${file.getBaseName()}: no "${part} = defineRelationsPart(...)".`);
  return call;
}

function partTables(file: SourceFile, part: string): ObjectLiteralExpression {
  const arg = partCall(file, part).getArguments()[0];
  if (!arg || !Node.isObjectLiteralExpression(arg))
    throw new Error(`${file.getBaseName()}: the tables of ${part} aren't an object literal.`);
  return arg;
}

/** The object the part's callback returns: `{ activity: {...}, customer: {...} }`. */
function partConfig(file: SourceFile, part: string): ObjectLiteralExpression {
  const callback = partCall(file, part).getArguments()[1];
  if (!callback || !Node.isArrowFunction(callback))
    throw new Error(`${file.getBaseName()}: ${part} has no (r) => ({...}) callback.`);
  const body = callback.getBody();
  const object = Node.isParenthesizedExpression(body) ? body.getExpression() : undefined;
  if (!object || !Node.isObjectLiteralExpression(object))
    throw new Error(`${file.getBaseName()}: the callback of ${part} must return an object literal: (r) => ({...}).`);
  return object;
}

function relationTable(file: SourceFile, part: string, table: string): ObjectLiteralExpression | undefined {
  const prop = partConfig(file, part).getProperty(table);
  const init = prop && Node.isPropertyAssignment(prop) ? prop.getInitializer() : undefined;
  return init && Node.isObjectLiteralExpression(init) ? init : undefined;
}

/** Start of the line holding a node's first leading comment, or the node. */
function lineStart(file: SourceFile, node: Node): number {
  const comments = node.getLeadingCommentRanges();
  const pos = comments.length ? comments[0].getPos() : node.getStart();
  return file.getFullText().lastIndexOf('\n', pos - 1) + 1;
}

function indentOf(file: SourceFile, lineStartPos: number): string {
  return /^[ \t]*/.exec(file.getFullText().slice(lineStartPos))![0];
}

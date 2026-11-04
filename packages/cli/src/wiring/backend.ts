import { applyEdits, modify, parse } from 'jsonc-parser';
import type { Changes } from '../core/changes.js';
import type { ResourceNames } from '../core/names.js';
import type { SourceFile } from 'ts-morph';
import { render } from '../core/templates.js';
import {
  appendToList,
  arrayProperty,
  decoratorObject,
  editSource,
  ensureArrayElement,
  ensureNamedImport,
  ensureSpread,
  insertImportLine,
  variableObject,
} from './ast.js';
import { Node } from 'ts-morph';

import { BACKEND, CONTRACTS_SRC } from '../core/workspace.js';

export { BACKEND, CONTRACTS_SRC };
export const API_MODULE = `${BACKEND}/apps/api/src/api.module.ts`;
export const DB_SCHEMA = `${BACKEND}/libs/database/src/schema.ts`;
/** The API contracts package, shared by the backend and the frontend. */
export const CONTRACTS_PACKAGE = '@dafne/contracts';
export const CONTRACTS_INDEX = `${CONTRACTS_SRC}/index.ts`;

const JSON_FORMAT = { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } };

/** Sets `path` in a JSON(C) file, keeping comments and layout, unless it's already set. */
function setJson(changes: Changes, file: string, path: string[], value: unknown) {
  changes.update(file, (source) => {
    let node: unknown = parse(source);
    for (const key of path) node = (node as Record<string, unknown> | undefined)?.[key];
    if (node !== undefined) return source;
    return applyEdits(source, modify(source, path, value, JSON_FORMAT));
  });
}

/** Registers a lib: nest-cli.json project, tsconfig paths and ApiModule import. */
export function wireLib(changes: Changes, { p }: ResourceNames) {
  const lib = `libs/${p.kebab}`;
  setJson(changes, `${BACKEND}/nest-cli.json`, ['projects', p.kebab], {
    type: 'library',
    root: lib,
    entryFile: 'index',
    sourceRoot: `${lib}/src`,
    compilerOptions: { tsConfigPath: `${lib}/tsconfig.lib.json` },
  });
  const tsconfig = `${BACKEND}/tsconfig.json`;
  setJson(changes, tsconfig, ['compilerOptions', 'paths', `@app/${p.kebab}`], [
    `./${lib}/src/index.ts`,
  ]);
  setJson(changes, tsconfig, ['compilerOptions', 'paths', `@app/${p.kebab}/*`], [
    `./${lib}/src/*`,
  ]);

  const moduleClass = `${p.pascal}Module`;
  changes.update(API_MODULE, (source) =>
    editSource(API_MODULE, source, (file) => {
      ensureNamedImport(file, `@app/${p.kebab}`, moduleClass);
      const options = () => decoratorObject(file, 'Module');
      ensureArrayElement(file, arrayProperty(file, options, 'imports'), moduleClass);
    }),
  );
}

/** Adds a controller or service to the lib's @Module and (services) to its index. */
export function wireIntoLib(
  changes: Changes,
  { p }: ResourceNames,
  kind: 'controller' | 'service',
) {
  const src = `${BACKEND}/libs/${p.kebab}/src`;
  const modulePath = `${src}/${p.kebab}.module.ts`;
  const className = `${p.pascal}${kind === 'controller' ? 'Controller' : 'Service'}`;
  const fileImport = `./${p.kebab}.${kind}.js`;

  changes.update(modulePath, (source) =>
    editSource(modulePath, source, (file) => {
      ensureNamedImport(file, fileImport, className);
      const options = () => decoratorObject(file, 'Module');
      const lists = kind === 'controller' ? ['controllers'] : ['providers', 'exports'];
      for (const list of lists)
        ensureArrayElement(file, arrayProperty(file, options, list), className);
    }),
  );

  // The controller stays private to the lib, like in the existing ones.
  if (kind === 'service')
    changes.update(`${src}/index.ts`, (source) => ensureExportStar(source, fileImport));
}

/** Exports the contract file from the contracts package (with .ts, see its index). */
export function wireContract(changes: Changes, { p }: ResourceNames) {
  changes.update(CONTRACTS_INDEX, (source) => ensureExportStar(source, `./${p.kebab}.ts`));
}

/** Adds the table file's tables and relations to the database schema. */
export function wireTable(changes: Changes, { s, p }: ResourceNames) {
  const namespace = p.camel;
  const relations = `${s.camel}Relations`;
  const tables = `${s.camel}Tables`;
  changes.update(DB_SCHEMA, (source) =>
    editSource(DB_SCHEMA, source, (file) => {
      const module = `./tables/${p.kebab}.js`;
      if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === module))
        insertImportLine(file, `* as ${namespace}`, module);

      if (!file.getVariableDeclaration(tables)) {
        // After the last `const { xRelations, ...xTables } = x;`.
        const destructures = file
          .getVariableStatements()
          .filter((st) =>
            st.getDeclarations().some((d) => Node.isObjectBindingPattern(d.getNameNode())),
          );
        const last = destructures[destructures.length - 1];
        const line = `const { ${relations}, ...${tables} } = ${namespace};`;
        if (!last) throw new Error(`No "const { xRelations, ...xTables } = x;" found in ${DB_SCHEMA}.`);
        file.insertText(last.getEnd(), `\n${line}`);
      }

      ensureSpread(file, variableObject(file, 'schema'), tables);
      const merged = mergeRelationsCall(file);
      if (merged) {
        if (!merged.getArguments().some((a) => a.getText() === relations))
          appendToList(file, merged, merged.getArguments(), relations);
      } else ensureSpread(file, variableObject(file, 'relations'), relations);
    }),
  );
}

export const MERGE_RELATIONS = `${BACKEND}/libs/database/src/merge-relations.ts`;

/** The `mergeRelations(...)` call that builds `relations`, if schema.ts uses it. */
function mergeRelationsCall(file: SourceFile) {
  const init = file.getVariableDeclaration('relations')?.getInitializer();
  return init && Node.isCallExpression(init) && init.getExpression().getText() === 'mergeRelations'
    ? init
    : undefined;
}

/**
 * Switches schema.ts from `{ ...defineRelations(schema), ...xRelations }`
 * to `mergeRelations(defineRelations(schema), xRelations)`, so a part can
 * add relations to another part's table (see merge-relations.ts).
 */
export function ensureMergedRelations(changes: Changes) {
  if (!changes.exists(MERGE_RELATIONS))
    changes.create(MERGE_RELATIONS, render('backend/merge-relations.ts', {}));
  changes.update(DB_SCHEMA, (source) =>
    editSource(DB_SCHEMA, source, (file) => {
      if (mergeRelationsCall(file)) return;
      const object = variableObject(file, 'relations');
      const parts = object.getProperties().map((p) => {
        if (!Node.isSpreadAssignment(p))
          throw new Error(`${DB_SCHEMA}: "relations" has a property that isn't a spread (${p.getText()}); merge it by hand.`);
        return p.getExpression().getText();
      });
      const indent = '  ';
      file.replaceText(
        [object.getStart(), object.getEnd()],
        `mergeRelations(\n${parts.map((p) => `${indent}${p},`).join('\n')}\n)`,
      );
      if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === './merge-relations.js'))
        insertImportLine(file, '{ mergeRelations }', './merge-relations.js');
    }),
  );
}

/** Adds `export * from 'specifier';` after the other exports, unless present. */
function ensureExportStar(source: string, specifier: string) {
  const line = `export * from '${specifier}';`;
  if (source.includes(`'${specifier}'`) || source.includes(`"${specifier}"`)) return source;
  const lines = source.replace(/\n*$/, '').split('\n');
  let at = lines.length;
  for (let i = lines.length - 1; i >= 0; i--)
    if (lines[i].startsWith('export * from')) {
      at = i + 1;
      break;
    }
  lines.splice(at, 0, line);
  return `${lines.join('\n')}\n`;
}

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

import { BACKEND, backendLib, backendPackage, CONTRACTS_SRC } from '../core/workspace.js';

export { BACKEND, CONTRACTS_SRC };
export const API_MODULE = `${BACKEND}/src/crm-api.module.ts`;
export const DB_SCHEMA = `${backendLib('database')}/src/schema.ts`;
/** The API contracts package, shared by the backend and the frontend. */
export const CONTRACTS_PACKAGE = '@dafne/contracts';
export const CONTRACTS_INDEX = `${CONTRACTS_SRC}/index.ts`;

const JSON_FORMAT = { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } };

/** Adds `{ "path": ref }` to a tsconfig's "references", unless it's there. */
function ensureReference(changes: Changes, tsconfig: string, ref: string) {
  changes.update(tsconfig, (source) => {
    const refs = (parse(source) as { references?: { path: string }[] }).references ?? [];
    if (refs.some((r) => r.path.replace(/\/$/, '') === ref)) return source;
    return applyEdits(
      source,
      modify(source, ['references', refs.length], { path: ref }, { ...JSON_FORMAT, isArrayInsertion: true }),
    );
  });
}

/** Adds a dependency to a package.json, keeping them sorted, unless it's there. */
function ensureDependency(changes: Changes, file: string, name: string, version: string) {
  changes.update(file, (source) => {
    const pkg = JSON.parse(source) as { dependencies?: Record<string, string> };
    if (pkg.dependencies?.[name]) return source;
    pkg.dependencies = Object.fromEntries(
      Object.entries({ ...pkg.dependencies, [name]: version }).sort(([a], [b]) => a.localeCompare(b)),
    );
    return JSON.stringify(pkg, null, 2) + '\n';
  });
}

/**
 * Registers a lib (a workspace package) in the app: its dependency, the
 * TypeScript project references (the app's tsconfig and tsconfig.build, and
 * the root's, as `nx sync`
 * would write them) and the CrmApiModule import. The new package still needs
 * `pnpm install` to be linked.
 */
export function wireLib(changes: Changes, { p }: ResourceNames) {
  const name = backendPackage(p.kebab);
  ensureDependency(changes, `${BACKEND}/package.json`, name, 'workspace:*');
  for (const tsconfig of ['tsconfig.json', 'tsconfig.build.json'])
    ensureReference(changes, `${BACKEND}/${tsconfig}`, `../../${backendLib(p.kebab)}`);
  ensureReference(changes, 'tsconfig.json', `./${backendLib(p.kebab)}`);

  const moduleClass = `${p.pascal}Module`;
  changes.update(API_MODULE, (source) =>
    editSource(API_MODULE, source, (file) => {
      ensureNamedImport(file, name, moduleClass);
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
  const src = `${backendLib(p.kebab)}/src`;
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

export const MERGE_RELATIONS = `${backendLib('database')}/src/merge-relations.ts`;

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

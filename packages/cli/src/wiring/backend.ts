import { applyEdits, modify, parse } from 'jsonc-parser';
import type { Changes } from '../core/changes.ts';
import type { ResourceNames } from '../core/names.ts';
import type { SourceFile } from 'ts-morph';
import { render } from '../core/templates.ts';
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
} from './ast.ts';
import { Node } from 'ts-morph';

import { appModule, backendApp, backendLib, backendPackage, CONTRACTS_SRC, DEFAULT_APP } from '../core/workspace.ts';

export { CONTRACTS_SRC };
export const DB_SCHEMA = `${backendLib('database')}/src/schema.ts`;
/** The API contracts package, shared by the backend and the frontend. */
export const CONTRACTS_PACKAGE = '@dafne/contracts';
export const CONTRACTS_INDEX = `${CONTRACTS_SRC}/index.ts`;

const JSON_FORMAT = { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } };

/** Adds `{ "path": ref }` to a tsconfig's "references", unless it's there. */
export function ensureReference(changes: Changes, tsconfig: string, ref: string) {
  changes.update(tsconfig, (source) => {
    const refs = (parse(source) as { references?: { path: string }[] }).references ?? [];
    if (refs.some((r) => r.path.replace(/\/$/, '') === ref)) {
      return source;
    }
    return applyEdits(
      source,
      modify(source, ['references', refs.length], { path: ref }, { ...JSON_FORMAT, isArrayInsertion: true }),
    );
  });
}

/** Adds a dependency to a package.json (or a dev one), keeping them sorted, unless it's there. */
export function ensureDependency(
  changes: Changes,
  file: string,
  name: string,
  version: string,
  field: 'dependencies' | 'devDependencies' = 'dependencies',
) {
  changes.update(file, (source) => {
    const pkg = JSON.parse(source) as Record<string, Record<string, string> | undefined>;
    if (pkg[field]?.[name]) {
      return source;
    }
    pkg[field] = Object.fromEntries(
      Object.entries({ ...pkg[field], [name]: version }).sort(([a], [b]) => a.localeCompare(b)),
    );
    return JSON.stringify(pkg, null, 2) + '\n';
  });
}

/**
 * Registers a resource's module in a backend app: the dependency on its lib
 * (`lib`, default the resource's own), the TypeScript project references
 * (the app's tsconfig and tsconfig.build, and the root's, as `nx sync`
 * would write them) and the import in the app's root module. A new
 * package still needs `pnpm install` to be linked.
 */
export function wireLib(changes: Changes, { p }: ResourceNames, app = DEFAULT_APP, lib = p.kebab) {
  const name = backendPackage(lib);
  const dir = backendApp(app);
  ensureDependency(changes, `${dir}/package.json`, name, 'workspace:*');
  // rspack bundles the lib's sources, but its npm packages are loaded from
  // the app's node_modules: the app lists them too.
  const libJson = changes.read(`${backendLib(lib)}/package.json`);
  const libDeps = libJson ? ((JSON.parse(libJson) as { dependencies?: Record<string, string> }).dependencies ?? {}) : {};
  for (const [dep, version] of Object.entries(libDeps)) {
    ensureDependency(changes, `${dir}/package.json`, dep, version);
  }
  for (const tsconfig of ['tsconfig.json', 'tsconfig.build.json']) {
    if (changes.exists(`${dir}/${tsconfig}`)) {
      ensureReference(changes, `${dir}/${tsconfig}`, `../../${backendLib(lib)}`);
    }
  }
  ensureReference(changes, 'tsconfig.json', `./${backendLib(lib)}`);

  const moduleClass = `${p.pascal}Module`;
  const modulePath = appModule(app);
  changes.update(modulePath, (source) =>
    editSource(modulePath, source, (file) => {
      ensureNamedImport(file, name, moduleClass);
      const options = () => decoratorObject(file, 'Module');
      ensureArrayElement(file, arrayProperty(file, options, 'imports'), moduleClass);
    }),
  );
}

/**
 * Adds a controller or service to the resource's @Module and (services) to
 * its lib's index. In another lib (`lib`), the module sits in src/<plural>.
 */
export function wireIntoLib(
  changes: Changes,
  { p }: ResourceNames,
  kind: 'controller' | 'service',
  lib = p.kebab,
) {
  const nested = lib !== p.kebab;
  const src = `${backendLib(lib)}/src`;
  const dir = nested ? `${src}/${p.kebab}` : src;
  const modulePath = `${dir}/${p.kebab}.module.ts`;
  const className = `${p.pascal}${kind === 'controller' ? 'Controller' : 'Service'}`;
  const fileImport = `./${p.kebab}.${kind}.js`;

  changes.update(modulePath, (source) =>
    editSource(modulePath, source, (file) => {
      ensureNamedImport(file, fileImport, className);
      const options = () => decoratorObject(file, 'Module');
      const lists = kind === 'controller' ? ['controllers'] : ['providers', 'exports'];
      for (const list of lists) {
        ensureArrayElement(file, arrayProperty(file, options, list), className);
      }
    }),
  );

  // The controller stays private to the lib, like in the existing ones.
  if (kind === 'service') {
    const specifier = nested ? `./${p.kebab}/${p.kebab}.service.js` : fileImport;
    changes.update(`${src}/index.ts`, (source) => ensureExportStar(source, specifier));
  }
}

/** Exports a module in src/<plural> of another lib from that lib's index. */
export function exportNestedModule(changes: Changes, { p }: ResourceNames, lib: string) {
  changes.update(`${backendLib(lib)}/src/index.ts`, (source) => ensureExportStar(source, `./${p.kebab}/${p.kebab}.module.js`));
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
      if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === module)) {
        insertImportLine(file, `* as ${namespace}`, module);
      }

      if (!file.getVariableDeclaration(tables)) {
        // After the last `const { xRelations, ...xTables } = x;`.
        const destructures = file
          .getVariableStatements()
          .filter((st) =>
            st.getDeclarations().some((d) => Node.isObjectBindingPattern(d.getNameNode())),
          );
        const last = destructures[destructures.length - 1];
        const line = `const { ${relations}, ...${tables} } = ${namespace};`;
        if (!last) {
          throw new Error(`No "const { xRelations, ...xTables } = x;" found in ${DB_SCHEMA}.`);
        }
        file.insertText(last.getEnd(), `\n${line}`);
      }

      ensureSpread(file, variableObject(file, 'schema'), tables);
      const merged = mergeRelationsCall(file);
      if (merged) {
        if (!merged.getArguments().some((a) => a.getText() === relations)) {
          appendToList(file, merged, merged.getArguments(), relations);
        }
      } else {
        ensureSpread(file, variableObject(file, 'relations'), relations);
      }
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
  if (!changes.exists(MERGE_RELATIONS)) {
    changes.create(MERGE_RELATIONS, render('backend/merge-relations.ts', {}));
  }
  changes.update(DB_SCHEMA, (source) =>
    editSource(DB_SCHEMA, source, (file) => {
      if (mergeRelationsCall(file)) {
        return;
      }
      const object = variableObject(file, 'relations');
      const parts = object.getProperties().map((p) => {
        if (!Node.isSpreadAssignment(p)) {
          throw new Error(`${DB_SCHEMA}: "relations" has a property that isn't a spread (${p.getText()}); merge it by hand.`);
        }
        return p.getExpression().getText();
      });
      const indent = '  ';
      file.replaceText(
        [object.getStart(), object.getEnd()],
        `mergeRelations(\n${parts.map((p) => `${indent}${p},`).join('\n')}\n)`,
      );
      if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === './merge-relations.js')) {
        insertImportLine(file, '{ mergeRelations }', './merge-relations.js');
      }
    }),
  );
}

/** Adds `export * from 'specifier';` after the other exports, unless present. */
function ensureExportStar(source: string, specifier: string) {
  const line = `export * from '${specifier}';`;
  if (source.includes(`'${specifier}'`) || source.includes(`"${specifier}"`)) {
    return source;
  }
  const lines = source.replace(/\n*$/, '').split('\n');
  let at = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].startsWith('export * from')) {
      at = i + 1;
      break;
    }
  }
  lines.splice(at, 0, line);
  return `${lines.join('\n')}\n`;
}

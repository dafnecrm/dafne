import { randomUUID } from 'node:crypto';
import { SyntaxKind, type SourceFile } from 'ts-morph';
import type { Changes } from '../core/changes.ts';
import { closest, resourceNames, words, type ResourceNames } from '../core/names.ts';
import { render } from '../core/templates.ts';
import { backendApp, backendLib, backendPackage, DEFAULT_APP } from '../core/workspace.ts';
import { contractFile, serviceFile } from '../pieces/backend.ts';
import { listResources } from '../fields/operations.ts';
import { readBody } from '../sync/body.ts';
import { arrayProperty, decoratorObject, editSource, ensureArrayElement, ensureNamedImport, insertImportLine } from './ast.ts';
import { ensureDependency, ensureExportStar, ensureReference } from './backend.ts';

/* A resource's change log: @dafne/backend-changelog wired into its module and controller, and its own partition. */

export const CHANGELOG_LIB = 'changelog';
export const CHANGELOG_DB_LIB = 'database-changelog';
const CHANGELOG_PACKAGE = backendPackage(CHANGELOG_LIB);
export const CHANGELOG_MIGRATIONS = `${backendLib(CHANGELOG_DB_LIB)}/migrations`;

/** The resources a change log can be turned on for: a table and a CRUD service (by plural name). */
export function crudResources(changes: Changes): string[] {
  return [...new Set(listResources(changes))]
    .filter((resource) => changes.exists(serviceFile(changes, resourceNames(resource))))
    .sort();
}

/** Why `input` isn't a resource: the closest one (a typo?), else the list, else how to make one. */
export function unknownResourceMessage(input: string, resources: readonly string[]): string {
  const asked = resourceNames(input).p.kebab;
  const guess = closest([words(input).join('-'), asked], resources);
  return [
    `No resource "${input}": there is no service for ${asked}.`,
    guess ? `Did you mean "${guess}"?` : undefined,
    resources.length ? `Resources: ${resources.join(', ')}.` : undefined,
    guess ? undefined : `A new one comes from dafne g backend-resource <name> --changelog.`,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Where a resource's backend code is: its lib, and the folder of its module. */
function resourceDir(changes: Changes, names: ResourceNames, input: string) {
  const service = serviceFile(changes, names);
  if (!changes.exists(service)) {
    throw new Error(unknownResourceMessage(input, crudResources(changes)));
  }
  const dir = service.slice(0, service.lastIndexOf('/'));
  const lib = dir.split('/')[2];
  return { dir, lib, nested: dir !== `${backendLib(lib)}/src` };
}

/** The constants of `<singular>.changelog.ts`. */
export const changelogNames = ({ s, p }: ResourceNames) => ({
  file: `${s.kebab}.changelog`,
  resource: `${p.constant}_RESOURCE`,
  options: `${s.constant}_CHANGELOG`,
});

export interface ChangelogResult {
  /** The resource already had a change log before this run. */
  wasLogged: boolean;
  /** The migration created for its partition, if any. */
  migration?: string;
}

/**
 * Turns on the change log of a resource (idempotent): `<singular>.changelog.ts`
 * (its name in the log and the logged fields: the body's), the module's
 * `ChangelogModule.forFeature`, the service's hooks under that name, the
 * controller's `GET :id/changes`, the lib's and app's dependencies. With
 * `partition`, a migration giving it its own partition of changelog.change
 * (moving its rows out of change_default when it was logged already).
 */
export function addChangelog(
  changes: Changes,
  names: ResourceNames,
  options: { partition?: boolean; app?: string; input?: string } = {},
): ChangelogResult {
  const { dir, lib, nested } = resourceDir(changes, names, options.input ?? names.p.kebab);
  const { p } = names;
  const c = changelogNames(names);
  const modulePath = `${dir}/${p.kebab}.module.ts`;
  const wasLogged = (changes.read(modulePath) ?? '').includes('ChangelogModule.forFeature');

  if (!wasLogged) {
    const file = `${dir}/${c.file}.ts`;
    if (!changes.exists(file)) {
      changes.create(file, render('backend/changelog.ts', { ...names, fields: bodyFields(changes, names) }));
    }
    wireModule(changes, modulePath, names);
    useResourceConstant(changes, `${dir}/${p.kebab}.service.ts`, names);
    if (/\bFsmModule\.forFeature\b/.test(changes.read(modulePath) ?? '')) {
      changes.warn(
        `${modulePath}: ${p.lower} have a state machine. Log its status changes too: changelogTransitionHook(${c.resource}) in its post hooks, with imports: [ChangelogModule] (see sales-orders.module.ts).`,
      );
    }
  }
  wireController(changes, `${dir}/${p.kebab}.controller.ts`, names);

  const src = `${backendLib(lib)}/src`;
  changes.update(`${src}/index.ts`, (source) =>
    ensureExportStar(source, nested ? `./${p.kebab}/${c.file}.js` : `./${c.file}.js`),
  );
  wireChangelogLib(changes, lib, options.app ?? DEFAULT_APP);

  const migration = options.partition ? addPartition(changes, names, wasLogged) : undefined;
  return { wasLogged, migration };
}

/** The keys of the resource's body schema: what a write can change. */
function bodyFields(changes: Changes, names: ResourceNames): string[] {
  const path = contractFile(names);
  const contract = changes.read(path);
  if (!contract) {
    changes.warn(`${path} not found: the change log logs no field yet (fields: []).`);
    return [];
  }
  try {
    return readBody(path, contract, names).map((field) => field.key);
  } catch (error) {
    changes.warn(`${(error as Error).message} The change log logs no field yet (fields: []).`);
    return [];
  }
}

/** `ChangelogModule` and `ChangelogModule.forFeature<Detail>(RESOURCE, OPTIONS)` in the module's imports. */
function wireModule(changes: Changes, path: string, names: ResourceNames) {
  const c = changelogNames(names);
  changes.update(path, (source) =>
    editSource(path, source, (file) => {
      ensureNamedImport(file, CHANGELOG_PACKAGE, 'ChangelogModule');
      if (file.getImportDeclaration('@dafne/contracts')) {
        ensureNamedImport(file, '@dafne/contracts', `${names.s.pascal}Detail`, { typeOnly: true });
      } else {
        insertImportLine(file, `type { ${names.s.pascal}Detail }`, '@dafne/contracts');
      }
      ensureNamedImport(file, `./${c.file}.js`, c.resource);
      ensureNamedImport(file, `./${c.file}.js`, c.options);
      const options = () => decoratorObject(file, 'Module');
      ensureArrayElement(file, arrayProperty(file, options, 'imports'), 'ChangelogModule');
      ensureArrayElement(
        file,
        arrayProperty(file, options, 'imports'),
        `ChangelogModule.forFeature<${names.s.pascal}Detail>(${c.resource}, ${c.options})`,
      );
    }),
  );
}

/** `registry.for('<plural>', …)` → `registry.for(<P>_RESOURCE, …)`: the hooks and the log share the name. */
function useResourceConstant(changes: Changes, path: string, names: ResourceNames) {
  const c = changelogNames(names);
  const literal = new RegExp(`registry\\.for\\((['"])${names.p.kebab}\\1`);
  if (!changes.exists(path) || !literal.test(changes.read(path)!)) {
    return;
  }
  changes.update(path, (source) =>
    editSource(path, source.replace(literal, `registry.for(${c.resource}`), (file) => {
      ensureNamedImport(file, `./${c.file}.js`, c.resource);
    }),
  );
}

/** The controller class (the one decorated with @Controller). */
function controllerClass(file: SourceFile) {
  const cls = file.getClasses().find((k) => k.getDecorator('Controller'));
  if (!cls) {
    throw new Error(`No @Controller class in ${file.getBaseName()}.`);
  }
  return cls;
}

/** Leading whitespace of the line holding `pos`. */
function indentAt(text: string, pos: number) {
  const start = text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(text.slice(start))![0];
}

/**
 * `GET :id/changes` after `get`, reading the log with ChangelogService
 * (added to the constructor), 404 through the service's `get`. Skipped
 * when the controller has a `changes` method.
 */
function wireController(changes: Changes, path: string, names: ResourceNames) {
  if (!changes.exists(path)) {
    changes.warn(`${path} not found: no GET :id/changes route.`);
    return;
  }
  const c = changelogNames(names);
  changes.update(path, (source) =>
    editSource(path, source, (file) => {
      if (controllerClass(file).getMethod('changes')) {
        return;
      }
      const service = `${names.p.pascal}Service`;
      const ctor = controllerClass(file).getConstructors()[0];
      const param = ctor?.getParameters().find((prm) => prm.getTypeNode()?.getText() === service);
      if (!ctor || !param) {
        throw new Error(`${path}: no constructor parameter of type ${service}.`);
      }
      const serviceProp = param.getName();
      const get = controllerClass(file).getMethod('get');
      const idParam = get?.getParameters()[0];
      if (!get || !idParam) {
        throw new Error(`${path}: no get(id) method to put GET :id/changes after.`);
      }
      const idText = idParam.getText();

      // The route first (after `get`), then the constructor (before it): offsets stay valid.
      const text = file.getFullText();
      const indent = indentAt(text, get.getStart());
      const inner = `${indent}  `;
      file.insertText(
        get.getEnd(),
        [
          '',
          '',
          `${indent}/** The changes of ${names.s.a}, newest first. 404 if it doesn't exist or is deleted. */`,
          `${indent}@Get(':id/changes')`,
          `${indent}async changes(`,
          `${inner}${idText},`,
          `${inner}@Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,`,
          `${indent}): Promise<ChangesList> {`,
          `${inner}await this.${serviceProp}.get(id);`,
          `${inner}return this.changelog.list(${c.resource}, id, query);`,
          `${indent}}`,
        ].join('\n'),
      );

      const ctorNow = controllerClass(file).getConstructors()[0];
      if (!ctorNow.getParameters().some((prm) => prm.getTypeNode()?.getText() === 'ChangelogService')) {
        const open = ctorNow.getFirstChildByKindOrThrow(SyntaxKind.OpenParenToken);
        const close = ctorNow.getFirstChildByKindOrThrow(SyntaxKind.CloseParenToken);
        const ctorIndent = indentAt(file.getFullText(), ctorNow.getStart());
        const params = [...ctorNow.getParameters().map((prm) => prm.getText()), 'private readonly changelog: ChangelogService'];
        file.replaceText(
          [open.getEnd(), close.getStart()],
          `\n${params.map((prm) => `${ctorIndent}  ${prm},`).join('\n')}\n${ctorIndent}`,
        );
      }

      for (const name of ['Get', 'Query']) {
        ensureNamedImport(file, '@nestjs/common', name);
      }
      ensureNamedImport(file, '@dafne/backend-common', 'ZodValidationPipe');
      ensureNamedImport(file, '@dafne/contracts', 'listChangesQuerySchema');
      ensureNamedImport(file, '@dafne/contracts', 'ChangesList', { typeOnly: true });
      ensureNamedImport(file, '@dafne/contracts', 'ListChangesQuery', { typeOnly: true });
      ensureNamedImport(file, CHANGELOG_PACKAGE, 'ChangelogService');
      ensureNamedImport(file, `./${c.file}.js`, c.resource);
    }),
  );
}

/**
 * The lib depends on @dafne/backend-changelog (and references it); the app
 * too, with its npm dependencies (rspack loads them from the app) and the
 * database package, whose migrations its build carries.
 */
function wireChangelogLib(changes: Changes, lib: string, app: string) {
  const libDir = backendLib(lib);
  ensureDependency(changes, `${libDir}/package.json`, CHANGELOG_PACKAGE, 'workspace:*');
  if (changes.exists(`${libDir}/tsconfig.json`)) {
    ensureReference(changes, `${libDir}/tsconfig.json`, `../${CHANGELOG_LIB}`);
  }

  const appDir = backendApp(app);
  if (!changes.exists(`${appDir}/package.json`)) {
    changes.warn(`${appDir}/package.json not found: add ${CHANGELOG_PACKAGE} to the app by hand.`);
    return;
  }
  const changelogJson = changes.read(`${backendLib(CHANGELOG_LIB)}/package.json`);
  const deps = changelogJson ? ((JSON.parse(changelogJson) as { dependencies?: Record<string, string> }).dependencies ?? {}) : {};
  for (const [dep, version] of Object.entries({ [CHANGELOG_PACKAGE]: 'workspace:*', ...deps })) {
    ensureDependency(changes, `${appDir}/package.json`, dep, version);
  }
  for (const tsconfig of ['tsconfig.json', 'tsconfig.build.json']) {
    if (changes.exists(`${appDir}/${tsconfig}`)) {
      for (const ref of [CHANGELOG_LIB, CHANGELOG_DB_LIB]) {
        ensureReference(changes, `${appDir}/${tsconfig}`, `../../${backendLib(ref)}`);
      }
    }
  }
  for (const ref of [CHANGELOG_LIB, CHANGELOG_DB_LIB]) {
    ensureReference(changes, 'tsconfig.json', `./${backendLib(ref)}`);
  }
}

/** The partition table of a resource: changelog.change_<plural_snake>. */
export const partitionTable = ({ p }: ResourceNames) => `change_${p.snake}`;

/** The migration that created the resource's partition, if any. */
export function findPartition(changes: Changes, { p }: ResourceNames): string | undefined {
  const value = new RegExp(`FOR VALUES IN \\(\\s*'${p.kebab}'\\s*\\)`);
  return changes
    .list(CHANGELOG_MIGRATIONS)
    .find((m) => value.test(changes.read(`${CHANGELOG_MIGRATIONS}/${m}/migration.sql`) ?? ''));
}

/** yyyyMMddHHmmss (UTC), as drizzle-kit names its migration folders. */
function timestamp(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

/** The partition's SQL: one statement, or (rows already logged) moving them out of change_default. */
export function partitionSql(names: ResourceNames, moveRows: boolean): string {
  const table = `"changelog"."${partitionTable(names)}"`;
  const value = `'${names.p.kebab}'`;
  const create = `CREATE TABLE ${table} PARTITION OF "changelog"."change" FOR VALUES IN (${value});`;
  const header = [
    `-- ${names.p.title} get a partition of the change log of their own (docs/databases.md).`,
    '-- Written by the CLI (dafne g backend-changelog --partition): drizzle-kit',
    "-- can't create partitions.",
  ];
  if (!moveRows) {
    return [...header, create, ''].join('\n');
  }
  return [
    ...header,
    '-- change_default holds its rows already: they move to the new partition',
    '-- (in the migration\'s transaction, with the table locked).',
    'ALTER TABLE "changelog"."change" DETACH PARTITION "changelog"."change_default";',
    '--> statement-breakpoint',
    create,
    '--> statement-breakpoint',
    `INSERT INTO "changelog"."change" SELECT * FROM "changelog"."change_default" WHERE "resource" = ${value};`,
    '--> statement-breakpoint',
    `DELETE FROM "changelog"."change_default" WHERE "resource" = ${value};`,
    '--> statement-breakpoint',
    'ALTER TABLE "changelog"."change" ATTACH PARTITION "changelog"."change_default" DEFAULT;',
    '',
  ].join('\n');
}

/**
 * A hand-written migration of @dafne/backend-database-changelog (what
 * `db generate --custom` makes: migration.sql and a snapshot chained to the
 * last one) creating the resource's partition. None if it has one.
 */
function addPartition(changes: Changes, names: ResourceNames, moveRows: boolean): string | undefined {
  const existing = findPartition(changes, names);
  if (existing) {
    changes.warn(`${names.p.kebab} has its partition already (${CHANGELOG_MIGRATIONS}/${existing}).`);
    return undefined;
  }
  const folders = changes.list(CHANGELOG_MIGRATIONS).filter((m) => /^\d{14}_/.test(m)).sort();
  if (!changes.exists(`${backendLib(CHANGELOG_DB_LIB)}/package.json`)) {
    throw new Error(`${backendLib(CHANGELOG_DB_LIB)} not found: no changelog schema to partition.`);
  }
  const last = folders[folders.length - 1];
  const lastSnapshot = last ? changes.read(`${CHANGELOG_MIGRATIONS}/${last}/snapshot.json`) : undefined;
  const prevId = lastSnapshot ? (JSON.parse(lastSnapshot) as { id: string }).id : '00000000-0000-0000-0000-000000000000';

  let stamp = timestamp();
  // Never before (or on) the last one: the migrator orders by timestamp.
  if (last && stamp <= last.slice(0, 14)) {
    stamp = String(Number(last.slice(0, 14)) + 1);
  }
  const folder = `${CHANGELOG_MIGRATIONS}/${stamp}_changelog-${names.p.kebab}`;
  changes.create(`${folder}/migration.sql`, partitionSql(names, moveRows));
  changes.create(
    `${folder}/snapshot.json`,
    `${JSON.stringify(
      { type: 'base', version: '9', dialect: 'postgres', id: randomUUID(), prevIds: [prevId], footprints: [], ddl: [] },
      null,
      2,
    )}\n`,
  );
  return folder;
}

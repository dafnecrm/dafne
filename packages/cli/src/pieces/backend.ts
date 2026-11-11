import { idTemplate, type IdSpec } from '../core/id.ts';
import type { Changes } from '../core/changes.ts';
import type { ResourceNames } from '../core/names.ts';
import { render } from '../core/templates.ts';
import { BACKEND_LIBS, backendLib, CONTRACTS_SRC } from '../core/workspace.ts';
import { ensureDependency, exportNestedModule, wireContract, wireIntoLib, wireLib, wireTable } from '../wiring/backend.ts';
import type { Ctx, Piece } from './pieces.ts';

/** Whether a resource's module goes into another lib (`lib`) rather than one of its own. */
const nestedIn = ({ p }: ResourceNames, lib: string | undefined): lib is string => lib !== undefined && lib !== p.kebab;

/** The folder of a resource's module: packages/backend/<plural>/src, or packages/backend/<lib>/src/<plural>. */
export const resourceSrc = (names: ResourceNames, lib?: string) =>
  nestedIn(names, lib) ? `${backendLib(lib)}/src/${names.p.kebab}` : `${backendLib(names.p.kebab)}/src`;

/** The libs in packages/backend (folders with a package.json). */
export function backendLibs(changes: Changes): string[] {
  return changes
    .list(BACKEND_LIBS)
    .filter((name) => changes.exists(`${backendLib(name)}/package.json`))
    .sort();
}
export const contractFile = ({ p }: ResourceNames) => `${CONTRACTS_SRC}/${p.kebab}.ts`;
export const tableFile = ({ p }: ResourceNames) => `${backendLib('database')}/src/tables/${p.kebab}.ts`;

/**
 * A resource's service: in its own lib (packages/backend/<plural>/src), or in
 * a folder of another lib (packages/backend/<lib>/src/<plural>, e.g.
 * sales-order-types in sales-orders). Its own lib's path when neither exists.
 */
export function serviceFile(changes: Changes, { p }: ResourceNames): string {
  const own = `${backendLib(p.kebab)}/src/${p.kebab}.service.ts`;
  if (changes.exists(own)) {
    return own;
  }
  for (const lib of backendLibs(changes)) {
    const nested = `${backendLib(lib)}/src/${p.kebab}/${p.kebab}.service.ts`;
    if (changes.exists(nested)) {
      return nested;
    }
  }
  return own;
}

/** Renders templates/backend/<template>.ejs for a resource (serial id unless `id` says otherwise). */
export const renderBackend = (template: string, names: ResourceNames, id?: IdSpec) =>
  render(`backend/${template}`, { ...names, id: idTemplate(id) });

const create = (ctx: Ctx, path: string, template: string) =>
  ctx.changes.create(path, renderBackend(template, ctx.names, ctx.id));

export const backendPieces: Record<string, Piece> = {
  contract: {
    description: 'Zod request schemas and response types in packages/contracts',
    deps: [],
    marker: contractFile,
    generate(ctx) {
      const file = contractFile(ctx.names);
      create(ctx, file, 'contract.ts');
      create(ctx, file.replace(/\.ts$/, '.spec.ts'), 'contract.spec.ts');
      wireContract(ctx.changes, ctx.names);
    },
  },
  table: {
    description: 'Drizzle table and relations in @dafne/backend-database',
    deps: [],
    marker: tableFile,
    generate(ctx) {
      create(ctx, tableFile(ctx.names), 'table.ts');
      wireTable(ctx.changes, ctx.names);
    },
  },
  lib: {
    description: 'Nest lib (workspace package: module, index, package.json, tsconfig, vitest) registered in the app, or a module in another lib (lib)',
    deps: [],
    marker: (n, ctx) => `${resourceSrc(n, ctx.lib)}/${n.p.kebab}.module.ts`,
    generate(ctx) {
      const { p } = ctx.names;
      if (nestedIn(ctx.names, ctx.lib)) {
        addToLib(ctx, ctx.lib);
        return;
      }
      const root = backendLib(p.kebab);
      create(ctx, `${root}/package.json`, 'package.json');
      create(ctx, `${root}/tsconfig.json`, 'tsconfig.json');
      create(ctx, `${root}/vitest.config.ts`, 'vitest.config.ts');
      create(ctx, `${root}/src/index.ts`, 'index.ts');
      create(ctx, `${root}/src/${p.kebab}.module.ts`, 'module.ts');
      wireLib(ctx.changes, ctx.names, ctx.app);
    },
  },
  service: {
    description: 'CRUD service with soft delete, and its unit test',
    deps: ['lib', 'contract', 'table'],
    marker: (n, ctx) => `${resourceSrc(n, ctx.lib)}/${n.p.kebab}.service.ts`,
    generate(ctx) {
      const base = `${resourceSrc(ctx.names, ctx.lib)}/${ctx.names.p.kebab}`;
      create(ctx, `${base}.service.ts`, 'service.ts');
      create(ctx, `${base}.service.spec.ts`, 'service.spec.ts');
      wireIntoLib(ctx.changes, ctx.names, 'service', ctx.lib);
    },
  },
  controller: {
    description: 'REST controller (list, get, create, update, delete)',
    deps: ['lib', 'contract', 'service'],
    marker: (n, ctx) => `${resourceSrc(n, ctx.lib)}/${n.p.kebab}.controller.ts`,
    generate(ctx) {
      create(ctx, `${resourceSrc(ctx.names, ctx.lib)}/${ctx.names.p.kebab}.controller.ts`, 'controller.ts');
      wireIntoLib(ctx.changes, ctx.names, 'controller', ctx.lib);
    },
  },
};

/**
 * A resource's module in an existing lib (packages/backend/<lib>/src/<plural>):
 * the lib gets the dependencies a generated lib has, exports the module,
 * and the app imports it from the lib.
 */
function addToLib(ctx: Ctx, lib: string) {
  const { changes, names } = ctx;
  const libJson = `${backendLib(lib)}/package.json`;
  if (!changes.exists(libJson)) {
    throw new Error(`${backendLib(lib)} isn't a backend lib: pick an existing one, or leave out --lib for a lib of its own.`);
  }
  create(ctx, `${resourceSrc(names, lib)}/${names.p.kebab}.module.ts`, 'module.ts');
  const template = JSON.parse(renderBackend('package.json', names, ctx.id)) as Record<string, Record<string, string> | undefined>;
  for (const field of ['dependencies', 'devDependencies'] as const) {
    for (const [dep, version] of Object.entries(template[field] ?? {})) {
      ensureDependency(changes, libJson, dep, version, field);
    }
  }
  exportNestedModule(changes, names, lib);
  wireLib(changes, names, ctx.app, lib);
}

/** Every backend piece of a resource, in generation order. */
export const BACKEND_RESOURCE = ['contract', 'table', 'lib', 'service', 'controller'];

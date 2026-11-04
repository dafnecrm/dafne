import { render } from '../core/templates.js';
import type { ResourceNames } from '../core/names.js';
import {
  CONTRACTS_SRC,
  wireContract,
  wireIntoLib,
  wireLib,
  wireTable,
} from '../wiring/backend.js';
import { backendLib } from '../core/workspace.js';
import type { Ctx, Piece } from './pieces.js';

export const libSrc = ({ p }: ResourceNames) => `${backendLib(p.kebab)}/src`;
export const contractFile = ({ p }: ResourceNames) =>
  `${CONTRACTS_SRC}/${p.kebab}.ts`;
export const tableFile = ({ p }: ResourceNames) =>
  `${backendLib('database')}/src/tables/${p.kebab}.ts`;

const create = (ctx: Ctx, path: string, template: string) =>
  ctx.changes.create(path, render(`backend/${template}`, ctx.names));

const lib: Piece = {
  description: 'Nest lib (workspace package: module, index, package.json, tsconfig, vitest) registered in the app and CrmApiModule',
  deps: [],
  marker: (n) => `${libSrc(n)}/${n.p.kebab}.module.ts`,
  generate(ctx) {
    const { p } = ctx.names;
    const src = libSrc(ctx.names);
    const root = backendLib(p.kebab);
    create(ctx, `${root}/package.json`, 'package.json');
    create(ctx, `${root}/tsconfig.json`, 'tsconfig.json');
    create(ctx, `${root}/vitest.config.ts`, 'vitest.config.ts');
    create(ctx, `${src}/index.ts`, 'index.ts');
    create(ctx, `${src}/${p.kebab}.module.ts`, 'module.ts');
    wireLib(ctx.changes, ctx.names);
  },
};

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
  lib,
  module: lib,
  service: {
    description: 'CRUD service with soft delete, and its unit test',
    deps: ['lib', 'contract', 'table'],
    marker: (n) => `${libSrc(n)}/${n.p.kebab}.service.ts`,
    generate(ctx) {
      const base = `${libSrc(ctx.names)}/${ctx.names.p.kebab}`;
      create(ctx, `${base}.service.ts`, 'service.ts');
      create(ctx, `${base}.service.spec.ts`, 'service.spec.ts');
      wireIntoLib(ctx.changes, ctx.names, 'service');
    },
  },
  controller: {
    description: 'REST controller (list, get, create, update, delete)',
    deps: ['lib', 'contract', 'service'],
    marker: (n) => `${libSrc(n)}/${n.p.kebab}.controller.ts`,
    generate(ctx) {
      create(ctx, `${libSrc(ctx.names)}/${ctx.names.p.kebab}.controller.ts`, 'controller.ts');
      wireIntoLib(ctx.changes, ctx.names, 'controller');
    },
  },
};

/** Every backend piece of a resource, in generation order. */
export const BACKEND_RESOURCE = ['contract', 'table', 'lib', 'service', 'controller'];

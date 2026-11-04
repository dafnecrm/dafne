import { parse } from 'jsonc-parser';
import { rmSync } from 'node:fs';
import { flushChanges } from 'nx/src/generators/tree.js';
import backendAppGenerator from '../src/generators/backend-app/generator.ts';
import backendLibGenerator from '../src/generators/backend-lib/generator.ts';
import backendResourceGenerator from '../src/generators/backend-resource/generator.ts';
import contractGenerator from '../src/generators/contract/generator.ts';
import frontendLibGenerator from '../src/generators/frontend-lib/generator.ts';
import { diskTree, fixtureCopy, reader } from './helpers.ts';

let root: string;
let read: (path: string) => string;

/** Runs a generator on the fixture copy and writes the result, as `nx g` does. */
async function generate<T>(generator: (tree: ReturnType<typeof diskTree>, options: T) => Promise<unknown>, options: T) {
  const tree = diskTree(root);
  await generator(tree, options);
  const changes = tree.listChanges();
  flushChanges(root, changes);
  return changes.map((change) => `${change.type} ${change.path}`);
}

beforeEach(() => {
  root = fixtureCopy('generators');
  read = reader(root);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('backend-resource', () => {
  it('generates and wires the contract, table, lib, service and controller', async () => {
    const changes = await generate(backendResourceGenerator, { name: 'invoice' });
    expect(changes).toEqual(
      expect.arrayContaining([
        'CREATE packages/contracts/src/invoices.ts',
        'CREATE packages/backend/database/src/tables/invoices.ts',
        'CREATE packages/backend/invoices/package.json',
        'CREATE packages/backend/invoices/src/invoices.service.ts',
        'CREATE packages/backend/invoices/src/invoices.controller.ts',
        'UPDATE apps/crm-api/src/crm-api.module.ts',
        'UPDATE packages/backend/database/src/schema.ts',
        'UPDATE packages/contracts/src/index.ts',
      ]),
    );
    expect(read('apps/crm-api/package.json')).toContain('"@dafne/backend-invoices": "workspace:*"');
    expect(read('apps/crm-api/src/crm-api.module.ts')).toContain('InvoicesModule');
    expect(read('tsconfig.json')).toContain('./packages/backend/invoices');
    const module = read('packages/backend/invoices/src/invoices.module.ts');
    expect(module).toContain('controllers: [InvoicesController]');
    expect(module).toContain('providers: [InvoicesService]');
    expect(read('packages/contracts/src/messages/en.ts')).toContain('Invoice not found');
  });

  it('adds the fields to the table, the contract, the service and the specs', async () => {
    await generate(backendResourceGenerator, {
      name: 'invoice',
      fields: ['number:string:length=20:required:unique', 'status:enum:values=draft|sent|paid:default=draft', 'customer:ref:to=customers'],
    });
    const table = read('packages/backend/database/src/tables/invoices.ts');
    expect(table).toContain("number: varchar('number', { length: 20 }).notNull().unique()");
    expect(table).toContain("mysqlEnum('status', ['draft', 'sent', 'paid']).default('draft')");
    expect(table).toContain('customerId:');
    const contract = read('packages/contracts/src/invoices.ts');
    expect(contract).toContain("number: requiredText(20, msg('invoices.number.required'))");
    expect(contract).toContain('INVOICE_STATUSES');
    expect(contract).toContain('customerId: optionalText(');
    expect(read('packages/backend/invoices/src/invoices.service.ts')).toContain('number: body.number');
    // parse() gives null for the optional fields a sample leaves out.
    expect(read('packages/contracts/src/invoices.spec.ts')).toMatch(/number: 'Number',\s*status: null,\s*customerId: null/);
  });

  it('refuses a resource that exists', async () => {
    await generate(backendResourceGenerator, { name: 'invoice' });
    await expect(generate(backendResourceGenerator, { name: 'invoices' })).rejects.toThrow(/already exists/);
  });
});

describe('backend-lib', () => {
  it('creates an empty lib, named as given, registered in the app', async () => {
    await generate(backendLibGenerator, { name: 'geo-data' });
    expect(read('packages/backend/geo-data/package.json')).toContain('"name": "@dafne/backend-geo-data"');
    expect(JSON.parse(read('packages/backend/geo-data/package.json')).nx.tags).toEqual(['scope:backend']);
    expect(read('packages/backend/geo-data/src/geo-data.module.ts')).toContain('export class GeoDataModule {}');
    expect(read('apps/crm-api/src/crm-api.module.ts')).toContain("import { GeoDataModule } from '@dafne/backend-geo-data';");
    expect(read('apps/crm-api/tsconfig.json')).toContain('../../packages/backend/geo-data');
  });
});

describe('backend-app', () => {
  it('creates a Nest app, formatted with its own Prettier config', async () => {
    await generate(backendAppGenerator, { name: 'worker', port: 3002 });
    expect(read('apps/worker/package.json')).toContain('"name": "@dafne/worker"');
    expect(JSON.parse(read('apps/worker/package.json')).nx.tags).toEqual(['scope:backend']);
    expect(read('apps/worker/.prettierrc')).toContain('singleQuote');
    const main = read('apps/worker/src/main.ts');
    expect(main).toContain("import { WorkerModule } from './worker.module.js';");
    expect(main).toContain('process.env.PORT ?? 3002');
    expect(read('apps/worker/src/worker.controller.ts')).toContain('export class WorkerController');
    expect(read('tsconfig.json')).toContain('./apps/worker');
  });

  it('takes libs, with their npm dependencies', async () => {
    await generate(backendAppGenerator, { name: 'worker' });
    await generate(backendLibGenerator, { name: 'jobs', app: 'worker' });
    expect(read('apps/worker/src/worker.module.ts')).toContain('JobsModule],');
    const pkg = read('apps/worker/package.json');
    expect(pkg).toContain('"@dafne/backend-jobs": "workspace:*"');
    expect(pkg).toContain('"drizzle-orm"');
    expect(read('apps/worker/tsconfig.json')).toContain('../../packages/backend/jobs');
  });
});

describe('contract', () => {
  it('creates the contract and its spec, exported from the index', async () => {
    await generate(contractGenerator, { name: 'reports' });
    expect(read('packages/contracts/src/reports.ts')).toContain('export const reportBodySchema');
    expect(read('packages/contracts/src/reports.spec.ts')).toContain('reportBodySchema');
    expect(read('packages/contracts/src/index.ts')).toContain("export * from './reports.ts';");
  });
});

describe('frontend-lib', () => {
  it('creates an empty lib, named as given, registered in the frontend', async () => {
    await generate(frontendLibGenerator, { name: 'charts' });
    expect(read('packages/frontend/charts/package.json')).toContain('"name": "@dafne/frontend-charts"');
    expect(JSON.parse(read('packages/frontend/charts/package.json')).nx.tags).toEqual(['scope:frontend']);
    expect(read('packages/frontend/charts/eslint.config.mjs')).toContain('../eslint.config.mjs');
    expect(read('packages/frontend/charts/src/index.ts')).toContain('export {};');
    expect(read('apps/crm-web/package.json')).toContain('"@dafne/frontend-charts": "workspace:*"');
    expect(read('apps/crm-web/next.config.ts')).toMatch(
      /transpilePackages: \[\s*"@dafne\/contracts",\s*"@dafne\/frontend-auth",\s*"@dafne\/frontend-charts",?\s*\]/,
    );
    expect(parse(read('apps/crm-web/tsconfig.json')).nx.sync.ignoredDependencies).toEqual([
      '@dafne/contracts',
      '@dafne/frontend-auth',
      '@dafne/frontend-charts',
    ]);
    expect(read('tsconfig.json')).toContain('./packages/frontend/charts');
  });

  it('wires a lib only once', async () => {
    await generate(frontendLibGenerator, { name: 'charts' });
    await generate(frontendLibGenerator, { name: 'charts', force: true });
    expect(read('apps/crm-web/next.config.ts').match(/@dafne\/frontend-charts/g)).toHaveLength(1);
    expect(read('apps/crm-web/tsconfig.json').match(/@dafne\/frontend-charts/g)).toHaveLength(1);
  });
});

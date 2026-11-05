import { logger } from '@nx/devkit';
import { parse } from 'jsonc-parser';
import { rmSync } from 'node:fs';
import { flushChanges } from 'nx/src/generators/tree.js';
import backendAppGenerator from '../src/generators/backend-app/generator.ts';
import backendLibGenerator from '../src/generators/backend-lib/generator.ts';
import backendResourceGenerator from '../src/generators/backend-resource/generator.ts';
import contractGenerator from '../src/generators/contract/generator.ts';
import frontendAppGenerator from '../src/generators/frontend-app/generator.ts';
import frontendDetailGenerator from '../src/generators/frontend-detail/generator.ts';
import frontendLibGenerator from '../src/generators/frontend-lib/generator.ts';
import frontendNavGenerator from '../src/generators/frontend-nav/generator.ts';
import frontendResourceGenerator from '../src/generators/frontend-resource/generator.ts';
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
        'UPDATE apps/sales-api/src/sales-api.module.ts',
        'UPDATE packages/backend/database/src/schema.ts',
        'UPDATE packages/contracts/src/index.ts',
      ]),
    );
    expect(read('apps/sales-api/package.json')).toContain('"@dafne/backend-invoices": "workspace:*"');
    expect(read('apps/sales-api/src/sales-api.module.ts')).toContain('InvoicesModule');
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
    expect(read('apps/sales-api/src/sales-api.module.ts')).toContain("import { GeoDataModule } from '@dafne/backend-geo-data';");
    expect(read('apps/sales-api/tsconfig.json')).toContain('../../packages/backend/geo-data');
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
    // Migrations on start: the build carries them, the app depends on the migrator.
    expect(main).toContain("migrations: join(import.meta.dirname, 'migrations'),");
    expect(read('apps/worker/rspack.config.js')).toContain('migrationCopyPatterns(import.meta.dirname)');
    expect(read('apps/worker/package.json')).toContain('"@dafne/backend-migrator": "workspace:*"');
    for (const tsconfig of ['tsconfig.json', 'tsconfig.build.json'])
      expect(read(`apps/worker/${tsconfig}`)).toContain('../../packages/backend/migrator');
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
    expect(read('apps/sales-web/package.json')).toContain('"@dafne/frontend-charts": "workspace:*"');
    expect(read('apps/sales-web/next.config.ts')).toMatch(
      /transpilePackages: \[\s*"@dafne\/contracts",\s*"@dafne\/frontend-auth",\s*"@dafne\/frontend-charts",?\s*\]/,
    );
    expect(parse(read('apps/sales-web/tsconfig.json')).nx.sync.ignoredDependencies).toEqual([
      '@dafne/contracts',
      '@dafne/frontend-auth',
      '@dafne/frontend-charts',
    ]);
    expect(read('tsconfig.json')).toContain('./packages/frontend/charts');
  });

  it('wires a lib only once', async () => {
    await generate(frontendLibGenerator, { name: 'charts' });
    await generate(frontendLibGenerator, { name: 'charts', force: true });
    expect(read('apps/sales-web/next.config.ts').match(/@dafne\/frontend-charts/g)).toHaveLength(1);
    expect(read('apps/sales-web/tsconfig.json').match(/@dafne\/frontend-charts/g)).toHaveLength(1);
  });
});

const PAGES = 'apps/sales-web/app/[locale]/(app)/invoices';

describe('frontend-resource', () => {
  it('generates the pages, the data module and the sidebar link, with their messages', async () => {
    await generate(backendResourceGenerator, { name: 'invoice' });
    const changes = await generate(frontendResourceGenerator, { name: 'invoice', icon: 'ReceiptIcon' });
    expect(changes).toEqual(
      expect.arrayContaining([
        'CREATE apps/sales-web/lib/invoices.ts',
        'CREATE apps/sales-web/lib/invoices-table.ts',
        `CREATE ${PAGES}/actions.ts`,
        `CREATE ${PAGES}/schema.ts`,
        `CREATE ${PAGES}/invoice-dialogs.tsx`,
        `CREATE ${PAGES}/page.tsx`,
        `CREATE ${PAGES}/invoices-table.tsx`,
        `CREATE ${PAGES}/invoice-detail.tsx`,
        `CREATE ${PAGES}/[id]/page.tsx`,
        `CREATE ${PAGES}/[id]/load-invoice.ts`,
        `CREATE ${PAGES}/invoice-form.tsx`,
        `CREATE ${PAGES}/new/page.tsx`,
        `CREATE ${PAGES}/[id]/edit/page.tsx`,
        'UPDATE apps/sales-web/lib/navigation.ts',
        'UPDATE apps/sales-web/messages/en.json',
        'UPDATE apps/sales-web/messages/it.json',
      ]),
    );
    expect(read(`${PAGES}/invoices-table.tsx`)).toContain('ReceiptIcon');
    expect(read('apps/sales-web/lib/navigation.ts')).toContain('{ title: "invoices", href: "/invoices", icon: ReceiptIcon }');
    const en = JSON.parse(read('apps/sales-web/messages/en.json'));
    expect(en.invoices.title).toBe('Invoices');
    expect(en.nav.invoices).toBe('Invoices');
  });

  it('syncs the pages with the fields of the contract', async () => {
    await generate(backendResourceGenerator, {
      name: 'invoice',
      fields: ['number:string:length=20:required', 'status:enum:values=draft|sent|paid:default=draft'],
    });
    await generate(frontendResourceGenerator, { name: 'invoice' });
    expect(read(`${PAGES}/schema.ts`)).toMatch(/number: /);
    expect(read(`${PAGES}/invoice-form.tsx`)).toContain('name="number"');
    expect(read(`${PAGES}/invoice-form.tsx`)).toContain('name="status"');
    expect(read(`${PAGES}/invoices-table.tsx`)).toContain('col.accessor("status"');
    expect(read('apps/sales-web/lib/invoices-table.ts')).toContain('INVOICE_STATUS_OPTIONS');
    expect(JSON.parse(read('apps/sales-web/messages/en.json')).invoices.fields.number).toBe('Number');
  });

  it('refuses a resource whose pages exist', async () => {
    await generate(frontendResourceGenerator, { name: 'invoice' });
    await expect(generate(frontendResourceGenerator, { name: 'invoice' })).rejects.toThrow('already exists');
  });

  it('warns when the resource has no contract', async () => {
    const tree = diskTree(root);
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    await frontendResourceGenerator(tree, { name: 'invoice' });
    expect(warn.mock.calls.flat().join('\n')).toContain("packages/contracts/src/invoices.ts doesn't exist");
    warn.mockRestore();
  });
});

describe('frontend parts', () => {
  it('generates a part with the parts it needs, and only those', async () => {
    await generate(backendResourceGenerator, { name: 'invoice' });
    const changes = await generate(frontendDetailGenerator, { name: 'invoice' });
    expect(changes).toEqual(
      expect.arrayContaining([
        'CREATE apps/sales-web/lib/invoices.ts',
        `CREATE ${PAGES}/actions.ts`,
        `CREATE ${PAGES}/invoice-detail.tsx`,
        `CREATE ${PAGES}/[id]/page.tsx`,
      ]),
    );
    expect(changes).not.toContain(`CREATE ${PAGES}/page.tsx`);
    expect(changes).not.toContain(`CREATE ${PAGES}/invoice-form.tsx`);
    expect(changes).not.toContain('UPDATE apps/sales-web/lib/navigation.ts');
  });

  it('adds a sidebar link once, in a new section when asked', async () => {
    await generate(frontendNavGenerator, { name: 'invoice', section: 'Billing' });
    await generate(frontendNavGenerator, { name: 'invoice', section: 'Billing' });
    const nav = read('apps/sales-web/lib/navigation.ts');
    expect(nav.match(/href: "\/invoices"/g)).toHaveLength(2); // the section's and the link's
    expect(nav).toContain('title: "billing"');
    expect(JSON.parse(read('apps/sales-web/messages/en.json')).nav.billing).toBe('Billing');
  });
});

describe('frontend-app', () => {
  it('creates a Next app like sales-web, without its resources', async () => {
    const changes = await generate(frontendAppGenerator, { name: 'billing-web', port: 4100 });
    const pkg = JSON.parse(read('apps/billing-web/package.json'));
    expect(pkg.name).toBe('@dafne/billing-web');
    expect(pkg.scripts.dev).toBe('next dev --port 4100');
    expect(pkg.nx.tags).toEqual(['scope:frontend']);
    expect(read('apps/billing-web/.env.example')).toContain('APP_URL=http://localhost:4100');
    expect(read('apps/billing-web/.gitignore')).toContain('/.next/');
    expect(changes).toContain('CREATE apps/billing-web/app/favicon.ico');
    expect(changes).toContain('CREATE apps/billing-web/app/[locale]/(app)/account/page.tsx');
    expect(changes).toContain('CREATE apps/billing-web/app/[locale]/(auth)/sign-in/page.tsx');
    expect(changes.filter((change) => /customers|products|activities|users|country|geo/.test(change))).toEqual([]);
    const en = JSON.parse(read('apps/billing-web/messages/en.json'));
    expect(en.nav.tagline).toBe('Billing web');
    expect(en.customers).toBeUndefined();
    expect(read('apps/billing-web/lib/navigation.ts')).not.toContain('customers');
    expect(read('apps/billing-web/lib/app-form/app-form.ts')).not.toContain('CountrySelectField');
  });

  it('takes the pages of a resource and the frontend libs', async () => {
    await generate(frontendAppGenerator, { name: 'billing-web' });
    await generate(frontendResourceGenerator, { name: 'invoice', app: 'billing-web' });
    await generate(frontendLibGenerator, { name: 'charts', app: 'billing-web' });
    expect(read('apps/billing-web/app/[locale]/(app)/invoices/page.tsx')).toContain('InvoicesPage');
    expect(read('apps/billing-web/lib/navigation.ts')).toContain('href: "/invoices"');
    expect(JSON.parse(read('apps/billing-web/messages/it.json')).invoices.title).toBe('Invoices');
    expect(read('apps/billing-web/next.config.ts')).toContain('"@dafne/frontend-charts"');
    expect(read('apps/billing-web/package.json')).toContain('"@dafne/frontend-charts": "workspace:*"');
    expect(read('apps/sales-web/package.json')).not.toContain('frontend-charts');
  });
});

import { logger } from '@nx/devkit';
import { parse } from 'jsonc-parser';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { flushChanges } from 'nx/src/generators/tree.js';
import backendAppGenerator from '../src/generators/backend-app/generator.ts';
import backendLibGenerator from '../src/generators/backend-lib/generator.ts';
import backendResourceGenerator from '../src/generators/backend-resource/generator.ts';
import contractGenerator from '../src/generators/contract/generator.ts';
import contractSyncGenerator from '../src/generators/contract-sync/generator.ts';
import frontendAppGenerator from '../src/generators/frontend-app/generator.ts';
import frontendDataGenerator from '../src/generators/frontend-data/generator.ts';
import frontendDetailGenerator from '../src/generators/frontend-detail/generator.ts';
import frontendLibGenerator from '../src/generators/frontend-lib/generator.ts';
import frontendListGenerator from '../src/generators/frontend-list/generator.ts';
import frontendNavGenerator from '../src/generators/frontend-nav/generator.ts';
import frontendResourceGenerator from '../src/generators/frontend-resource/generator.ts';
import frontendResourceSyncGenerator from '../src/generators/frontend-resource-sync/generator.ts';
import removeBackendDbColumnGenerator from '../src/generators/remove-backend-db-column/generator.ts';
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
    // Only an identity id: no sample field.
    const table = read('packages/backend/database/src/tables/invoices.ts');
    expect(table).toContain("id: serial('id').primaryKey()");
    expect(table).not.toMatch(/\bname:/);
    expect(read('packages/contracts/src/invoices.ts')).toMatch(/invoiceBodySchema = z\.strictObject\(\{\}\)[\s\S]*id: number;/);
    expect(read('packages/backend/invoices/src/invoices.controller.ts')).toContain("@Param('id', IdPipe) id: number");
  });

  it('adds the fields to the table, the contract, the service and the specs', async () => {
    await generate(backendResourceGenerator, {
      name: 'invoice',
      fields: ['number:string:length=20:required:unique', 'status:enum:values=draft|sent|paid:default=draft', 'customer:ref:to=customers'],
    });
    const table = read('packages/backend/database/src/tables/invoices.ts');
    expect(table).toContain("number: varchar('number', { length: 20 }).notNull().unique()");
    expect(table).toMatch(/text\('status', \{ enum: \['draft', 'sent', 'paid'\] \}\)\.default\(\s*'draft',?\s*\)/);
    expect(table).toContain('customerId:');
    const contract = read('packages/contracts/src/invoices.ts');
    expect(contract).toContain("number: requiredText(20, msg('invoices.number.required'))");
    expect(contract).toContain('INVOICE_STATUSES');
    expect(contract).toContain("customerId: optionalId(msg('invoices.customerId.required'))");
    expect(read('packages/backend/invoices/src/invoices.service.ts')).toContain('number: body.number');
    // parse() gives null for the optional fields a sample leaves out.
    expect(read('packages/contracts/src/invoices.spec.ts')).toMatch(/number: 'Number',\s*status: null,\s*customerId: null/);
  });

  it('makes a uuid id, picked by the database, that a key to the resource follows', async () => {
    await generate(backendResourceGenerator, { name: 'payment', idType: 'uuid' });
    const table = read('packages/backend/database/src/tables/payments.ts');
    expect(table).toContain("id: uuid('id').primaryKey().defaultRandom()");
    expect(table).toMatch(/import \{[^}]*\buuid\b[^}]*\} from 'drizzle-orm\/pg-core'/);
    const contract = read('packages/contracts/src/payments.ts');
    expect(contract).toContain('id: string;');
    expect(contract).toContain('[0-9a-fA-F]{8}-');
    const service = read('packages/backend/payments/src/payments.service.ts');
    expect(service).toContain('getPayment(id: string)');
    expect(service).toContain('id: String,');
    expect(read('packages/backend/payments/src/payments.controller.ts')).toContain("@Param('id', UuidPipe) id: string");
    expect(read('packages/backend/payments/src/payments.service.spec.ts')).toContain("'00000000-0000-4000-8000-000000000001'");

    await generate(backendResourceGenerator, { name: 'refund', fields: ['payment:ref:to=payments:required'] });
    expect(read('packages/backend/database/src/tables/refunds.ts')).toContain("paymentId: uuid('payment_id')");
    const refunds = read('packages/contracts/src/refunds.ts');
    expect(refunds).toContain("paymentId: requiredUuid(msg('refunds.paymentId.required'))");
    expect(refunds).toMatch(/import \{[^}]*requiredUuid[^}]*\} from '\.\/common\.ts'/);
    expect(read('packages/backend/refunds/src/refunds.service.spec.ts')).toContain("paymentId: '00000000-0000-4000-8000-000000000001'");
  });

  it('makes a varchar id of the length given, picked by the client', async () => {
    await generate(backendResourceGenerator, { name: 'voucher', idType: 'varchar', idLength: 12 });
    const table = read('packages/backend/database/src/tables/vouchers.ts');
    expect(table).not.toMatch(/randomUUID|\$defaultFn/);
    expect(table).toMatch(/id: varchar\('id', \{ length: 12 \}\)\.primaryKey\(\)/);
    const contract = read('packages/contracts/src/vouchers.ts');
    expect(contract).toContain('id: z.string().max(12).optional()');
    // In the body: the client picks it.
    expect(contract).toMatch(/voucherBodySchema = z\.strictObject\(\{\s*id: requiredText\(12, msg\('vouchers\.id\.required'\)\)/);
    const service = read('packages/backend/vouchers/src/vouchers.service.ts');
    expect(service).toMatch(/\.values\(\{\s*id: body\.id,/);
    // Set on create only.
    expect(service).not.toMatch(/\.set\(\{[^}]*id: body\.id/);
    expect(service).toContain(".catch(rethrowTakenId)");
    expect(service).toContain('const rethrowTakenId = rethrowPostgresError([');
    expect(service).toContain("constraint: 'voucher_pkey'");
    expect(read('packages/contracts/src/messages/en.ts')).toMatch(/id: \{[^}]*taken: 'This id is already in use'/);
    expect(read('packages/backend/vouchers/src/vouchers.controller.ts')).toContain("@Param('id', new TextIdPipe(12)) id: string");
  });

  it('keeps a varchar id the sync reads in the filters', async () => {
    await generate(backendResourceGenerator, { name: 'voucher', idType: 'varchar', idLength: 40, fields: ['code:string:required'] });
    const contract = read('packages/contracts/src/vouchers.ts');
    expect(contract).toContain('id: z.string().max(40).optional()');
    expect(contract).toContain("VOUCHER_FILTER_FIELDS = ['id', 'code']");
  });

  it('puts the module in a folder of an existing lib (lib)', async () => {
    await generate(backendResourceGenerator, { name: 'invoice' });
    const changes = await generate(backendResourceGenerator, { name: 'invoice-line', lib: 'invoices', fields: ['name:string:required'] });
    const dir = 'packages/backend/invoices/src/invoice-lines';
    expect(changes).toEqual(
      expect.arrayContaining([
        `CREATE ${dir}/invoice-lines.module.ts`,
        `CREATE ${dir}/invoice-lines.service.ts`,
        `CREATE ${dir}/invoice-lines.service.spec.ts`,
        `CREATE ${dir}/invoice-lines.controller.ts`,
      ]),
    );
    expect(changes).not.toContain('CREATE packages/backend/invoice-lines/package.json');
    const index = read('packages/backend/invoices/src/index.ts');
    expect(index).toContain("export * from './invoice-lines/invoice-lines.module.js';");
    expect(index).toContain("export * from './invoice-lines/invoice-lines.service.js';");
    // Each service names its page size: no clash in the lib's index.
    expect(read(`${dir}/invoice-lines.service.ts`)).toContain('export const INVOICE_LINES_DEFAULT_PAGE_SIZE = 20;');
    const module = read(`${dir}/invoice-lines.module.ts`);
    expect(module).toContain('controllers: [InvoiceLinesController]');
    expect(module).toContain('providers: [InvoiceLinesService]');
    expect(read(`${dir}/invoice-lines.service.ts`)).toContain('name: body.name');
    const app = read('apps/sales-api/src/sales-api.module.ts');
    expect(app).toMatch(/import \{[^}]*\bInvoiceLinesModule\b[^}]*\} from '@dafne\/backend-invoices'/);
    expect(app).toMatch(/imports: \[[\s\S]*InvoiceLinesModule/);
    expect(read('apps/sales-api/package.json')).not.toContain('@dafne/backend-invoice-lines');
    expect(read('tsconfig.json')).not.toContain('./packages/backend/invoice-lines');
  });

  it('adds what a generated lib depends on to the lib it goes into', async () => {
    await generate(backendLibGenerator, { name: 'billing' });
    await generate(backendResourceGenerator, { name: 'invoice', lib: 'billing' });
    const pkg = JSON.parse(read('packages/backend/billing/package.json')) as Record<string, Record<string, string>>;
    expect(pkg.dependencies).toMatchObject({ '@dafne/backend-session': 'workspace:*', '@dafne/contracts': 'workspace:*', 'drizzle-orm': 'catalog:' });
    expect(pkg.devDependencies).toMatchObject({ '@nestjs/testing': 'catalog:' });
    expect(read('apps/sales-api/package.json')).toContain('"drizzle-orm": "catalog:"');
  });

  it('rejects a lib that does not exist', async () => {
    await expect(generate(backendResourceGenerator, { name: 'invoice', lib: 'billing' })).rejects.toThrow(/isn't a backend lib/);
  });

  it('rejects an unknown id type, and a length without a varchar id', async () => {
    await expect(generate(backendResourceGenerator, { name: 'invoice', idType: 'bigint' })).rejects.toThrow(/isn't one of/);
    await expect(generate(backendResourceGenerator, { name: 'invoice', idType: 'uuid', idLength: 10 })).rejects.toThrow(/only for a varchar id/);
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
    for (const tsconfig of ['tsconfig.json', 'tsconfig.build.json']) {
      expect(read(`apps/worker/${tsconfig}`)).toContain('../../packages/backend/migrator');
    }
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
    // No field names the record: the pages show its id.
    expect(read(`${PAGES}/[id]/page.tsx`)).toContain('label={`${t("invoices.singular")} ${invoice.id}`}');
    expect(read(`${PAGES}/invoices-table.tsx`)).toContain('col.accessor("id"');
    expect(en.invoices.fields.name).toBeUndefined();
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

const LIB = 'packages/frontend/invoices';

describe('frontend-resource in a lib', () => {
  const FIELDS = ['number:string:length=20:required', 'status:enum:values=draft|sent|paid:default=draft'];

  it('puts the data, actions, components and texts in a new lib, the pages in the app', async () => {
    await generate(backendResourceGenerator, { name: 'invoice', fields: FIELDS });
    const changes = await generate(frontendResourceGenerator, { name: 'invoice', lib: 'invoices', icon: 'ReceiptIcon' });
    expect(changes).toEqual(
      expect.arrayContaining([
        `CREATE ${LIB}/package.json`,
        `CREATE ${LIB}/src/index.ts`,
        `CREATE ${LIB}/src/types.ts`,
        `CREATE ${LIB}/src/server.ts`,
        `CREATE ${LIB}/src/invoices-table.ts`,
        `CREATE ${LIB}/src/actions.ts`,
        `CREATE ${LIB}/src/schema.ts`,
        `CREATE ${LIB}/src/messages/en.ts`,
        `CREATE ${LIB}/src/messages/it.ts`,
        `CREATE ${LIB}/src/messages/index.ts`,
        `CREATE ${LIB}/src/components/invoice-dialogs.tsx`,
        `CREATE ${LIB}/src/components/invoices-table.tsx`,
        `CREATE ${LIB}/src/components/invoice-table-actions.tsx`,
        `CREATE ${LIB}/src/components/invoice-detail.tsx`,
        `CREATE ${LIB}/src/components/invoice-detail-actions.tsx`,
        `CREATE ${LIB}/src/components/invoice-form.tsx`,
        'CREATE apps/sales-web/lib/invoices-table.ts',
        `CREATE ${PAGES}/page.tsx`,
        `CREATE ${PAGES}/[id]/page.tsx`,
        `CREATE ${PAGES}/[id]/load-invoice.ts`,
        `CREATE ${PAGES}/new/page.tsx`,
        `CREATE ${PAGES}/[id]/edit/page.tsx`,
        'UPDATE apps/sales-web/i18n/request.ts',
        'UPDATE apps/sales-web/i18n/global.d.ts',
        'UPDATE apps/sales-web/lib/navigation.ts',
      ]),
    );
    expect(changes).not.toContain('CREATE apps/sales-web/lib/invoices.ts');
    expect(changes).not.toContain(`CREATE ${PAGES}/actions.ts`);

    // The package: exports, dependencies, wired into the app.
    const pkg = JSON.parse(read(`${LIB}/package.json`));
    expect(pkg.exports).toMatchObject({
      '.': './src/index.ts',
      './actions': './src/actions.ts',
      './server': './src/server.ts',
      './components/*': './src/components/*.tsx',
    });
    expect(pkg.dependencies).toMatchObject({ '@dafne/contracts': 'workspace:*', '@dafne/frontend-forms': 'workspace:*' });
    expect(pkg.peerDependencies['next-intl']).toBe('catalog:');
    expect(read('apps/sales-web/next.config.ts')).toContain('"@dafne/frontend-invoices"');
    expect(read(`${LIB}/src/index.ts`)).toContain('export * from "./invoices-table.ts";');
    expect(read(`${LIB}/src/index.ts`)).not.toContain('export {};');

    // The app: its table on /invoices, the pages import the lib.
    expect(read('apps/sales-web/lib/invoices-table.ts')).toContain('defineInvoicesTable({ path: "/invoices" })');
    expect(read(`${PAGES}/page.tsx`)).toContain('from "@dafne/frontend-invoices/components/invoices-table"');
    expect(read(`${PAGES}/[id]/load-invoice.ts`)).toContain('from "@dafne/frontend-invoices/server"');

    // The texts: the resource's in the lib, merged by the app.
    const en = read(`${LIB}/src/messages/en.ts`);
    expect(en).toContain('title: "Invoices"');
    expect(en).toMatch(/fields: \{[^}]*number: "Number"/);
    expect(en).toMatch(/status: \{[^}]*paid: "Paid"/);
    expect(read(`${LIB}/src/messages/it.ts`)).toContain('title: "Invoices"');
    expect(JSON.parse(read('apps/sales-web/messages/en.json')).invoices).toBeUndefined();
    expect(JSON.parse(read('apps/sales-web/messages/en.json')).nav.invoices).toBe('Invoices');
    const request = read('apps/sales-web/i18n/request.ts');
    expect(request).toContain('import { INVOICES_MESSAGES } from "@dafne/frontend-invoices";');
    expect(request).toContain('invoices: INVOICES_MESSAGES[resolved]');
    const types = read('apps/sales-web/i18n/global.d.ts');
    expect(types).toContain('import type { InvoicesMessages } from "@dafne/frontend-invoices";');
    expect(types).toContain('invoices: InvoicesMessages;');

    // Synced with the contract, in the lib's way.
    const table = read(`${LIB}/src/invoices-table.ts`);
    expect(table).toContain('INVOICE_STATUS_OPTIONS');
    expect(table).toContain('label: InvoicesMessageKey');
    expect(table).toContain('label: "invoices.fields.number" satisfies InvoicesMessageKey');
    expect(table).toContain('from "./messages/index.ts"');
    const columns = read(`${LIB}/src/components/invoices-table.tsx`);
    expect(columns).toContain('col.accessor("status"');
    expect(columns).toContain('href={`${path}/${encodeURIComponent(row.original.id)}`}');
    expect(columns).toContain('from "../invoices-table.ts"');
    // A value from the module the table's config type comes from: not a type-only import.
    expect(columns).not.toMatch(/import type \{[^}]*INVOICE_STATUS_OPTIONS/);
    expect(read(`${LIB}/src/components/invoice-form.tsx`)).toContain('name="number"');
    expect(read(`${LIB}/src/schema.ts`)).toContain('label: InvoicesMessageKey');
  });

  it('puts a resource in a subfolder of a lib named otherwise', async () => {
    await generate(backendResourceGenerator, { name: 'payment' });
    await generate(frontendResourceGenerator, { name: 'payment', lib: 'billing' });
    const pkg = JSON.parse(read('packages/frontend/billing/package.json'));
    expect(pkg.exports).toMatchObject({
      './payments': './src/payments/index.ts',
      './payments/server': './src/payments/server.ts',
      './payments/components/*': './src/payments/components/*.tsx',
    });
    expect(read('packages/frontend/billing/src/payments/payments-table.ts')).toContain('function definePaymentsTable');
    expect(read('apps/sales-web/app/[locale]/(app)/payments/page.tsx')).toContain('from "@dafne/frontend-billing/payments/server"');
    expect(read('apps/sales-web/i18n/request.ts')).toContain('import { PAYMENTS_MESSAGES } from "@dafne/frontend-billing/payments";');
  });

  it('generates the parts where the resource already is', async () => {
    await generate(backendResourceGenerator, { name: 'invoice' });
    await generate(frontendDataGenerator, { name: 'invoice', lib: 'invoices' });
    const changes = await generate(frontendListGenerator, { name: 'invoice' });
    expect(changes).toContain(`CREATE ${LIB}/src/components/invoices-table.tsx`);
    expect(changes).toContain(`CREATE ${PAGES}/page.tsx`);
    expect(changes).not.toContain('CREATE apps/sales-web/lib/invoices.ts');
  });

  it('refuses a lib for a resource whose pages are in the app', async () => {
    await generate(frontendDataGenerator, { name: 'invoice' });
    await expect(generate(frontendListGenerator, { name: 'invoice', lib: 'invoices' })).rejects.toThrow('apps/sales-web already');
  });

  it('syncs a lib resource with its contract, its texts included', async () => {
    await generate(backendResourceGenerator, { name: 'invoice', fields: ['name:string:required', ...FIELDS] });
    await generate(frontendResourceGenerator, { name: 'invoice', lib: 'invoices' });
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    await generate(removeBackendDbColumnGenerator, { name: 'invoices', columns: ['number', 'status'] });
    await generate(frontendResourceSyncGenerator, { name: 'invoices' });
    vi.restoreAllMocks();
    const columns = read(`${LIB}/src/components/invoices-table.tsx`);
    expect(columns).not.toMatch(/accessor\("(number|status)"/);
    expect(columns).toContain('col.accessor("name"');
    expect(read(`${LIB}/src/invoices-table.ts`)).not.toContain('INVOICE_STATUS_OPTIONS');
    expect(read(`${LIB}/src/components/invoice-form.tsx`)).not.toContain('name="status"');
    const en = read(`${LIB}/src/messages/en.ts`);
    expect(en).not.toMatch(/number: "Number"|paid: "Paid"/);
    expect(en).toContain('name: "Name"');
  });
});

describe('remove-backend-db-column', () => {
  const FIELDS = ['name:string:required', 'number:string:length=20:required', 'status:enum:values=draft|sent|paid:default=draft'];

  it('removes the columns from the table, the contract, the service, the specs and the messages', async () => {
    await generate(backendResourceGenerator, { name: 'invoice', fields: FIELDS });
    const changes = await generate(removeBackendDbColumnGenerator, { name: 'invoices', columns: ['name', 'status'] });
    expect(changes).toEqual(
      expect.arrayContaining([
        'UPDATE packages/backend/database/src/tables/invoices.ts',
        'UPDATE packages/contracts/src/invoices.ts',
        'UPDATE packages/backend/invoices/src/invoices.service.ts',
      ]),
    );
    const table = read('packages/backend/database/src/tables/invoices.ts');
    expect(table).not.toMatch(/\bname:|status:|invoice_name_idx/);
    expect(table).toContain("number: varchar('number'");
    const contract = read('packages/contracts/src/invoices.ts');
    expect(contract).not.toMatch(/\bname: requiredText|INVOICE_STATUSES|InvoiceStatus|status/);
    expect(contract).toContain('/** Defaults to createdAt. */');
    const service = read('packages/backend/invoices/src/invoices.service.ts');
    expect(service).toContain("sortBy = 'createdAt'");
    expect(service).not.toMatch(/body\.name|invoice\.name/);
    // The specs follow: the default order, the filter test, the expected rows and failures.
    const serviceSpec = read('packages/backend/invoices/src/invoices.service.spec.ts');
    expect(serviceSpec).toContain('asc(invoice.createdAt)');
    expect(serviceSpec).not.toMatch(/invoice\.name\b|body\(\{ name/);
    const contractSpec = read('packages/contracts/src/invoices.spec.ts');
    expect(contractSpec).not.toMatch(/rejects a blank name|name: /);
    expect(read('packages/contracts/src/messages/en.ts')).not.toContain('invoices: {\n    notFound: \'Invoice not found\',\n    name:');
    expect(read('packages/contracts/src/messages/en.ts')).toMatch(/number: \{ required:/);
  });

  it('refuses a column the table lacks', async () => {
    await generate(backendResourceGenerator, { name: 'invoice' });
    await expect(generate(removeBackendDbColumnGenerator, { name: 'invoice', columns: ['nope'] })).rejects.toThrow('no "nope" column');
  });
});

describe('contract-sync', () => {
  const TABLE = 'packages/backend/database/src/tables/invoices.ts';

  it('brings the contract, the service and the specs in line with the table', async () => {
    await generate(backendResourceGenerator, { name: 'invoice', fields: ['name:string:required'] });
    // A column added to the table by hand.
    writeFileSync(join(root, TABLE), read(TABLE).replace(/(\n\s*name: )/, "\n    notes: text('notes'),$1"));
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const changes = await generate(contractSyncGenerator, { name: 'invoices' });
    expect(changes).toEqual(
      expect.arrayContaining(['UPDATE packages/contracts/src/invoices.ts', 'UPDATE packages/backend/invoices/src/invoices.service.ts']),
    );
    expect(read('packages/contracts/src/invoices.ts')).toMatch(/\bnotes\b/);
    expect(read('packages/backend/invoices/src/invoices.service.ts')).toContain('body.notes');
    vi.restoreAllMocks();
  });

  it('leaves the service alone with service: false, and syncs every contract with all', async () => {
    await generate(backendResourceGenerator, { name: 'invoice', fields: ['name:string:required'] });
    writeFileSync(join(root, TABLE), read(TABLE).replace(/(\n\s*name: )/, "\n    notes: text('notes'),$1"));
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    const changes = await generate(contractSyncGenerator, { all: true, service: false });
    expect(changes).toContain('UPDATE packages/contracts/src/invoices.ts');
    expect(changes).not.toContain('UPDATE packages/backend/invoices/src/invoices.service.ts');
    vi.restoreAllMocks();
  });

  it('needs a resource or all', async () => {
    await expect(generate(contractSyncGenerator, {})).rejects.toThrow('Missing argument');
  });
});

describe('frontend-resource-sync', () => {
  it('removes from the pages what the contract dropped, and adds what it gained', async () => {
    await generate(backendResourceGenerator, {
      name: 'invoice',
      fields: ['name:string:required', 'number:string:length=20:required', 'status:enum:values=draft|sent|paid:default=draft'],
    });
    await generate(frontendResourceGenerator, { name: 'invoice' });
    await generate(removeBackendDbColumnGenerator, { name: 'invoice', columns: ['number', 'status'] });
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    await generate(frontendResourceSyncGenerator, { name: 'invoices' });
    expect(read(`${PAGES}/invoice-form.tsx`)).not.toMatch(/name="number"|name="status"|STATUS_OPTIONS|statusOptions/);
    expect(read(`${PAGES}/invoice-form.tsx`)).toContain('name="name"');
    // The enum went from the contract: its labels and their imports go too.
    expect(read(`${PAGES}/schema.ts`)).not.toMatch(/STATUS_OPTIONS|InvoiceStatus/);
    expect(read('apps/sales-web/lib/invoices-table.ts')).not.toMatch(/INVOICE_STATUS_OPTIONS|InvoiceStatus/);
    expect(read(`${PAGES}/invoice-detail.tsx`)).not.toMatch(/INVOICE_STATUS_OPTIONS|useOptionLabel/);
    expect(read(`${PAGES}/schema.ts`)).not.toMatch(/number: /);
    expect(read(`${PAGES}/invoices-table.tsx`)).not.toContain('col.accessor("number"');
    const table = read('apps/sales-web/lib/invoices-table.ts');
    expect(table).not.toMatch(/"number"|"status"/);
    expect(JSON.parse(read('apps/sales-web/messages/en.json')).invoices.fields.number).toBeUndefined();
    // Nothing left to read the field: no warning about it.
    expect(warn.mock.calls.flat().join('\n')).not.toContain('invoice.number');
    vi.restoreAllMocks();
  });

  it('keeps what the contract dropped with keep, and reports reads it can not remove', async () => {
    await generate(backendResourceGenerator, { name: 'invoice', fields: ['name:string:required'] });
    await generate(frontendResourceGenerator, { name: 'invoice' });
    // The user made the name the page title (the generated one shows the id).
    const page = `${PAGES}/[id]/page.tsx`;
    writeFileSync(
      join(root, page),
      read(page).replace('{`${t("invoices.singular")} ${invoice.id}`}</PageContentTitle>', '{invoice.name}</PageContentTitle>'),
    );
    expect(read(page)).toContain('{invoice.name}</PageContentTitle>');
    await generate(removeBackendDbColumnGenerator, { name: 'invoice', columns: ['name'] });
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    vi.spyOn(logger, 'info').mockImplementation(() => {});
    await generate(frontendResourceSyncGenerator, { name: 'invoice', keep: true });
    expect(read(`${PAGES}/invoice-form.tsx`)).toContain('name="name"');
    // With keep, the title's read of invoice.name is listed, left to fix.
    expect(warn.mock.calls.flat().join('\n')).toMatch(/\[id\]\/page\.tsx:\d+: invoice\.name/);
    warn.mockClear();
    await generate(frontendResourceSyncGenerator, { name: 'invoice' });
    expect(read(`${PAGES}/invoice-form.tsx`)).not.toContain('name="name"');
    // Otherwise the record's label takes its place.
    expect(read(page)).toContain('<PageContentTitle>{`${t("invoices.singular")} ${invoice.id}`}</PageContentTitle>');
    expect(warn.mock.calls.flat().join('\n')).not.toContain('invoice.name');
    vi.restoreAllMocks();
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

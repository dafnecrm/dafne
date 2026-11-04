import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseFieldSpec } from '../src/commands/field.js';
import { generateResource } from '../src/commands/generate.js';
import { Changes } from '../src/core/changes.js';
import { resourceNames } from '../src/core/names.js';
import { resourceMessages, syncMessages } from '../src/wiring/messages.js';
import { BACKEND_RESOURCE } from '../src/generators/backend.js';
import { FRONTEND_RESOURCE } from '../src/generators/frontend.js';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'project');
const options = { icon: 'FileIcon', section: 'CRM', admin: false };
const DIR = 'apps/crm-web/app/[locale]/(app)/invoices';
let root: string;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dafne-fields-'));
  cpSync(FIXTURE, root, { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('parseFieldSpec', () => {
  it('reads the type, flags and options', () => {
    expect(parseFieldSpec('status:enum:values=open|done:default=open:required')).toMatchObject({
      name: 'status',
      type: 'enum',
      values: ['open', 'done'],
      default: 'open',
      required: true,
    });
    expect(parseFieldSpec('notes:text:editor:api=detail|nofilter')).toMatchObject({ editor: true, api: ['detail', 'nofilter'] });
    expect(parseFieldSpec('customer:ref:to=customers:on-delete=cascade:inverse=-')).toMatchObject({
      to: 'customers',
      onDelete: 'cascade',
      inverse: false,
    });
  });

  it('rejects what it doesn\'t know', () => {
    expect(() => parseFieldSpec('due')).toThrow(/name:type/);
    expect(() => parseFieldSpec('due:time')).toThrow(/isn't a type/);
    expect(() => parseFieldSpec('due:date:color=red')).toThrow(/unknown option "color=red"/);
    expect(() => parseFieldSpec('status:enum')).toThrow(/needs values/);
    expect(() => parseFieldSpec('code:string:editor')).toThrow(/only for text/);
  });
});

describe('a resource with fields', () => {
  it('puts them in the table, the contract, the service and the pages', async () => {
    const changes = new Changes(root);
    await generateResource(changes, 'invoice', { backend: BACKEND_RESOURCE, frontend: FRONTEND_RESOURCE }, options, [
      parseFieldSpec('number:string:length=20:required'),
      parseFieldSpec('status:enum:values=draft|paid:default=draft'),
      parseFieldSpec('notes:text:editor:api=detail'),
    ]);
    // A new table has no rows: no warning about NOT NULL columns.
    expect(changes.warnings.join()).not.toMatch(/already has rows/);
    await changes.commit();

    const table = read('packages/backend/database/src/tables/invoices.ts');
    expect(table).toMatch(/number: varchar\('number', \{ length: 20 \}\)\.notNull\(\)/);
    expect(table).toContain('/** @api detail @form editor */');
    const contract = read('packages/contracts/src/invoices.ts');
    expect(contract).toMatch(/number: requiredText\(20/);
    expect(contract).toContain('INVOICE_STATUSES');
    expect(read('packages/backend/invoices/src/invoices.service.ts')).toContain('number: invoice.number');

    expect(read(`${DIR}/invoice-form.tsx`)).toContain('<field.TextEditorField label={t("invoices.fields.notes")} />');
    expect(read(`${DIR}/invoice-form.tsx`)).toContain('<form.AppField name="status">');
    expect(read(`${DIR}/invoices-table.tsx`)).toContain('number');
    expect(read(`${DIR}/invoice-detail.tsx`)).toMatch(/<Detail icon=\{TextIcon\} label=\{t\("invoices.fields.notes"\)\} wide>/);

    // The keys the new files use have texts in both languages' catalogs.
    expect(contract).toContain("msg('invoices.number.required')");
    const en = read('packages/contracts/src/messages/en.ts');
    expect(en).toMatch(/invoices: \{[^]*notFound: 'Invoice not found'/);
    expect(en).toMatch(/number: \{ required: 'Enter the number' \}/);
    expect(en).toMatch(/status: \{ required: 'Choose the status' \}/);
    expect(read('packages/contracts/src/messages/it.ts')).toMatch(/number: \{ required: 'Enter the number' \}/);
    for (const locale of ['en', 'it']) {
      const messages = JSON.parse(read(`apps/crm-web/messages/${locale}.json`));
      expect(messages.invoices).toMatchObject({
        title: 'Invoices',
        fields: { name: 'Name', number: 'Number', status: 'Status', notes: 'Notes', createdAt: 'Added' },
        status: { draft: 'Draft', paid: 'Paid' },
      });
      expect(messages.nav.invoices).toBe('Invoices');
    }
    // Existing texts are kept.
    expect(JSON.parse(read('apps/crm-web/messages/it.json')).nav.customers).toBe('Clienti');
    expect(changes.warnings.join()).toMatch(/still in English: translate them/);
  });

  it('adds the messages once', async () => {
    const changes = new Changes(root);
    await generateResource(changes, 'invoice', { backend: BACKEND_RESOURCE, frontend: FRONTEND_RESOURCE }, options);
    await changes.commit();
    const en = read('apps/crm-web/messages/en.json');
    const contracts = read('packages/contracts/src/messages/en.ts');
    const again = new Changes(root);
    syncMessages(again, resourceMessages(resourceNames('invoice')));
    await again.commit();
    expect(read('apps/crm-web/messages/en.json')).toBe(en);
    expect(read('packages/contracts/src/messages/en.ts')).toBe(contracts);
  });

  it('refuses fields for a table that already exists', async () => {
    const changes = new Changes(root);
    await expect(
      generateResource(changes, 'customer', { backend: ['table'], frontend: [] }, options, [parseFieldSpec('code:string')]),
    ).rejects.toThrow(/already exists: add fields with "dafne-old field add customers"/);
  });
});

import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Changes } from '../src/core/changes.js';
import { resourceNames } from '../src/core/names.js';
import { findRoot } from '../src/core/workspace.js';
import { BACKEND_RESOURCE, backendPieces } from '../src/generators/backend.js';
import {
  FRONTEND_RESOURCE,
  frontendPieces,
  generateComponent,
  generatePage,
} from '../src/generators/frontend.js';
import { generatePieces, type Ctx } from '../src/generators/pieces.js';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'project');
const options = { icon: 'FileIcon', section: 'CRM', admin: false };

let root: string;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function ctx(name: string, changes = new Changes(root)): Ctx {
  return { changes, names: resourceNames(name), options };
}

async function fullstack(name: string) {
  const c = ctx(name);
  generatePieces(backendPieces, BACKEND_RESOURCE, c);
  generatePieces(frontendPieces, FRONTEND_RESOURCE, c);
  await c.changes.commit();
  return c.changes;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dafne-cli-'));
  cpSync(FIXTURE, root, { recursive: true });
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('findRoot', () => {
  it('finds the folder with backend/ and frontend/ from inside it', () => {
    expect(findRoot(join(root, 'backend', 'apps'))).toBe(root);
  });
});

describe('a fullstack resource', () => {
  it('creates the backend and frontend files', async () => {
    const changes = await fullstack('invoice');
    const created = changes.summary().filter((c) => c.kind === 'create').map((c) => c.path);
    expect(created).toEqual(
      expect.arrayContaining([
        'backend/libs/invoices/src/invoices.controller.ts',
        'backend/libs/invoices/src/invoices.service.spec.ts',
        'backend/libs/contracts/src/invoices.ts',
        'backend/libs/database/src/tables/invoices.ts',
        'frontend/lib/invoices-table.ts',
        'frontend/app/(app)/invoices/[id]/edit/page.tsx',
        'frontend/app/(app)/invoices/invoice-form.tsx',
        'frontend/app/(app)/invoices/invoice-detail.tsx',
      ]),
    );
    expect(read('backend/libs/invoices/src/invoices.controller.ts')).toContain(
      "@Controller('invoices')",
    );
  });

  it('registers it everywhere', async () => {
    await fullstack('invoice');

    expect(JSON.parse(read('backend/nest-cli.json')).projects.invoices.root).toBe(
      'libs/invoices',
    );
    expect(read('backend/tsconfig.json')).toContain('"@app/invoices/*"');
    const api = read('backend/apps/api/src/api.module.ts');
    expect(api).toContain("import { InvoicesModule } from '@app/invoices';");
    expect(api).toMatch(/CustomersModule,\n {4}InvoicesModule,\n {2}\]/);
    const schema = read('backend/libs/database/src/schema.ts');
    expect(schema).toContain("import * as invoices from './tables/invoices.js';");
    expect(schema).toContain('const { invoiceRelations, ...invoiceTables } = invoices;');
    expect(schema).toContain('...customerTables, ...invoiceTables }');
    expect(schema).toContain('  ...invoiceRelations,\n};');
    expect(read('backend/libs/contracts/src/index.ts')).toContain(
      "export * from './invoices.ts';",
    );
    const module = read('backend/libs/invoices/src/invoices.module.ts');
    expect(module).toContain('controllers: [InvoicesController]');
    expect(module).toContain('exports: [InvoicesService]');
    expect(read('backend/libs/invoices/src/index.ts')).toContain(
      "export * from './invoices.service.js';",
    );
    const nav = read('frontend/lib/navigation.ts');
    expect(nav).toContain('  FileIcon,\n  type LucideIcon,');
    expect(nav).toContain('{ title: "Invoices", href: "/invoices", icon: FileIcon }');
  });

  it('refuses to overwrite, unless forced', async () => {
    await fullstack('invoice');
    expect(() => generatePieces(backendPieces, ['controller'], ctx('invoice'))).toThrow(
      /already exists/,
    );
    const forced = ctx('invoice', new Changes(root, { force: true }));
    expect(() => generatePieces(backendPieces, ['controller'], forced)).not.toThrow();
  });

  it("doesn't register twice", async () => {
    await fullstack('invoice');
    const before = read('backend/apps/api/src/api.module.ts');
    const c = ctx('invoice', new Changes(root, { force: true }));
    generatePieces(backendPieces, BACKEND_RESOURCE, c);
    generatePieces(frontendPieces, ['nav'], c);
    await c.changes.commit();
    expect(read('backend/apps/api/src/api.module.ts')).toBe(before);
    expect(read('frontend/lib/navigation.ts').match(/"\/invoices"/g)).toHaveLength(1);
  });
});

describe('single pieces', () => {
  it('adds the missing pieces a piece depends on', () => {
    const c = ctx('product');
    expect(generatePieces(backendPieces, ['controller'], c)).toEqual([
      'lib',
      'contract',
      'service',
      'table',
    ]);
  });

  it('skips dependencies that already exist', async () => {
    await fullstack('invoice');
    const c = ctx('invoice', new Changes(root, { force: true }));
    expect(generatePieces(frontendPieces, ['form'], c)).toEqual([]);
  });

  it('warns when the frontend has no backend contract', () => {
    const c = ctx('product');
    generatePieces(frontendPieces, ['data'], c);
    expect(c.changes.warnings[0]).toMatch(/contract/);
  });

  it('puts a new sidebar section before Admin', async () => {
    const c: Ctx = {
      ...ctx('report'),
      options: { icon: 'ChartBarIcon', section: 'Insights', admin: false },
    };
    generatePieces(frontendPieces, ['nav'], c);
    await c.changes.commit();
    const nav = read('frontend/lib/navigation.ts');
    expect(nav.indexOf('title: "Insights"')).toBeLessThan(nav.indexOf('title: "Admin"'));
    expect(nav).toContain('items: [{ title: "Reports", href: "/reports", icon: ChartBarIcon }]');
  });

  it('only creates files with --skip-wiring', () => {
    const changes = new Changes(root, { skipUpdates: true });
    generatePieces(backendPieces, ['lib'], ctx('invoice', changes));
    expect(changes.summary().every((c) => c.kind === 'create')).toBe(true);
    expect(changes.skipped).toContain('backend/apps/api/src/api.module.ts');
  });

  it('generates a blank page at a route', async () => {
    const changes = new Changes(root);
    expect(generatePage(changes, 'reports/monthly')).toBe(
      'frontend/app/(app)/reports/monthly/page.tsx',
    );
    await changes.commit();
    expect(read('frontend/app/(app)/reports/monthly/page.tsx')).toContain(
      'export default function MonthlyPage()',
    );
    expect(() => generatePage(new Changes(root), 'Bad Route')).toThrow();
  });

  it('generates a client component', async () => {
    const changes = new Changes(root);
    generateComponent(changes, 'StatusBadge', { client: true });
    await changes.commit();
    const source = read('frontend/components/status-badge.tsx');
    expect(source.startsWith('"use client";')).toBe(true);
    expect(source).toContain('export function StatusBadge(');
    expect(() => generateComponent(new Changes(root), 'x', { dir: '../outside' })).toThrow();
  });
});

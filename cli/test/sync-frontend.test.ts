import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { syncFrontend, syncOne } from '../src/commands/sync.js';
import { Changes } from '../src/core/changes.js';
import { resourceNames } from '../src/core/names.js';
import { BACKEND_RESOURCE, backendPieces } from '../src/generators/backend.js';
import { FRONTEND_RESOURCE, frontendPieces } from '../src/generators/frontend.js';
import { generatePieces } from '../src/generators/pieces.js';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'project');
const TABLE = 'backend/libs/database/src/tables/invoices.ts';
const DIR = 'frontend/app/[locale]/(app)/invoices';
let root: string;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** A generated invoices resource, with a `notes` column synced into the contract. */
beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'dafne-sync-frontend-'));
  cpSync(FIXTURE, root, { recursive: true });
  const changes = new Changes(root);
  const ctx = { changes, names: resourceNames('invoice'), options: { icon: 'FileIcon', section: 'CRM', admin: false } };
  generatePieces(backendPieces, BACKEND_RESOURCE, ctx);
  generatePieces(frontendPieces, FRONTEND_RESOURCE, ctx);
  await changes.commit();

  writeFileSync(
    join(root, TABLE),
    read(TABLE)
      .replace("name: varchar('name', { length: 255 }).notNull(),", "name: varchar('name', { length: 255 }).notNull(),\n    notes: varchar('notes', { length: 100 }),"),
  );
  const contract = new Changes(root);
  await syncOne(contract, 'invoices', [], { service: false });
  await contract.commit();
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('syncFrontend', () => {
  it('syncs the form, the table and the detail page together', async () => {
    const changes = new Changes(root);
    const { reports, skipped } = syncFrontend(changes, 'invoices');
    expect(skipped).toEqual([]);
    const paths = reports.map(([path]) => path);
    expect(paths).toEqual(
      expect.arrayContaining([
        `${DIR}/schema.ts`,
        `${DIR}/invoice-form.tsx`,
        'frontend/lib/invoices-table.ts',
        `${DIR}/invoices-table.tsx`,
        `${DIR}/invoice-detail.tsx`,
      ]),
    );
    await changes.commit();
    expect(read(`${DIR}/invoice-form.tsx`)).toContain('<form.AppField name="notes">');
    expect(read(`${DIR}/invoices-table.tsx`)).toContain('notes');
    expect(read(`${DIR}/invoice-detail.tsx`)).toContain('invoice.notes');

    // A second run finds nothing to add.
    const again = new Changes(root);
    syncFrontend(again, 'invoices');
    expect(again.summary()).toEqual([]);
  });

  it('skips the parts the resource lacks', () => {
    unlinkSync(join(root, `${DIR}/invoice-detail.tsx`));
    unlinkSync(join(root, `${DIR}/[id]/page.tsx`));
    const { reports, skipped } = syncFrontend(new Changes(root), 'invoices');
    expect(skipped).toEqual(['detail']);
    expect(reports.map(([path]) => path)).not.toContain(`${DIR}/invoice-detail.tsx`);
  });
});

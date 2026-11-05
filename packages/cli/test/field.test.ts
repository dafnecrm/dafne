import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Changes } from '../src/core/changes.ts';
import { commit, diskChanges } from './helpers.ts';
import { resourceNames } from '../src/core/names.ts';
import { addField, removeField } from '../src/fields/operations.ts';
import type { FieldSpec } from '../src/fields/spec.ts';
import { backendPieces } from '../src/pieces/backend.ts';
import { generatePieces } from '../src/pieces/pieces.ts';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'project');
const TABLES = 'packages/backend/database/src/tables';
let root: string;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const spec = (name: string, type: FieldSpec['type'], extra: Partial<FieldSpec> = {}): FieldSpec => ({
  name,
  type,
  required: false,
  unique: false,
  index: false,
  api: [],
  relation: 'many-to-one',
  ...extra,
});

/** Runs one field command and writes it, like the CLI does. */
async function run(edit: (changes: Changes) => unknown) {
  const changes = diskChanges(root);
  edit(changes);
  await commit(changes);
}

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'dafne-field-'));
  cpSync(FIXTURE, root, { recursive: true });
  // An "activities" table as the CLI generates it.
  await run((changes) =>
    generatePieces(backendPieces, ['table'], {
      changes,
      names: resourceNames('activity'),
      app: 'sales-api',
    }),
  );
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('field add', () => {
  it('adds a column before createdAt, with its import and index', async () => {
    await run((c) => addField(c, 'activities', spec('status', 'enum', { values: ['open', 'done'], required: true, default: 'open', index: true })));
    const table = read(`${TABLES}/activities.ts`);
    expect(table).toMatch(/id: serial[^\n]+\n\s+status: text\('status', \{ enum: \['open', 'done'\] \}\)\s*\.notNull\(\)\s*\.default\('open'\),\n\s+createdAt/);
    expect(table).toMatch(/import \{[^}]*\btext\b[^}]*\} from 'drizzle-orm\/pg-core'/);
    expect(table).toContain("index('activity_status_idx').on(table.status)");
  });

  it('writes @api tags above the column', async () => {
    await run((c) => addField(c, 'activities', spec('notes', 'text', { api: ['internal'] })));
    expect(read(`${TABLES}/activities.ts`)).toMatch(/\/\*\* @api internal \*\/\n\s+notes: text\('notes'\)/);
  });

  it('writes @form editor for a text field with editor', async () => {
    await run((c) => addField(c, 'activities', spec('description', 'text', { api: ['detail'], editor: true })));
    expect(read(`${TABLES}/activities.ts`)).toMatch(/\/\*\* @api detail @form editor \*\/\n\s+description: text\('description'\)/);
  });

  it('adds a many-to-one key with both relations, in the file that holds the key', async () => {
    await run((c) => addField(c, 'activities', spec('customer', 'ref', { to: 'customers' })));
    const table = read(`${TABLES}/activities.ts`);
    expect(table).toContain("import { customer } from './customers.js';");
    expect(table).toMatch(/customerId: integer\('customer_id'\)\.references\(\s*\(\) => customer\.id,\s*\{\s*onDelete: 'set null',?\s*\},?\s*\)/);
    expect(table).toContain("index('activity_customerId_idx').on(table.customerId)");
    expect(table).toMatch(/customer: r\.one\.customer\(\{\s*from: r\.activity\.customerId,\s*to: r\.customer\.id,/);
    expect(table).toMatch(/customer: \{\s*activities: r\.many\.activity\(\{\s*from: r\.customer\.id,\s*to: r\.activity\.customerId,/);
    expect(table).toContain('{ user, activity, customer }');
    // customers.ts doesn't import activities: no import cycle.
    expect(read(`${TABLES}/customers.ts`)).not.toContain('activit');

    const schema = read('packages/backend/database/src/schema.ts');
    expect(schema).toContain("import { mergeRelations } from './merge-relations.js';");
    expect(schema).toMatch(/relations = mergeRelations\(\s*defineRelations\(schema\),\s*authRelations,\s*customerRelations,\s*activityRelations,?\s*\)/);
    expect(read('packages/backend/database/src/merge-relations.ts')).toContain('export function mergeRelations');
  });

  it('makes a required key restrict deletes, and refuses set null', async () => {
    await run((c) => addField(c, 'activities', spec('customer', 'ref', { to: 'customers', required: true })));
    const table = read(`${TABLES}/activities.ts`);
    expect(table).toContain("onDelete: 'restrict'");
    expect(table).toContain('optional: false');
    expect(() =>
      addField(diskChanges(root), 'activities', spec('owner', 'ref', { to: 'users', required: true, onDelete: 'set null' })),
    ).toThrow(/nullable/);
  });

  it('adds a unique key and r.one on both sides for one-to-one', async () => {
    await run((c) => addField(c, 'customers', spec('manager', 'ref', { to: 'users', relation: 'one-to-one', inverse: 'managedCustomer' })));
    const table = read(`${TABLES}/customers.ts`);
    expect(table).toMatch(/managerId: text\('manager_id'\)\s*\.unique\(\)/);
    expect(table).toContain("import { user } from '../auth.js';");
    expect(table).toMatch(/user: \{\s*managedCustomer: r\.one\.customer\(/);
    expect(read('packages/backend/database/src/auth.ts')).not.toContain('managedCustomer');
  });

  it('puts the key on the other table for one-to-many', async () => {
    await run((c) => addField(c, 'customers', spec('tasks', 'ref', { to: 'activities', relation: 'one-to-many' })));
    const table = read(`${TABLES}/activities.ts`);
    expect(table).toContain("customerId: integer('customer_id')");
    expect(table).toMatch(/customer: \{\s*tasks: r\.many\.activity\(/);
  });

  it('creates a junction table for many-to-many', async () => {
    await run((c) => addField(c, 'activities', spec('customers', 'ref', { to: 'customers', relation: 'many-to-many' })));
    const table = read(`${TABLES}/activities.ts`);
    expect(table).toContain("export const activityCustomer = salesSchema.table(\n  'activity_customer',");
    expect(table).toContain('primaryKey({ columns: [table.activityId, table.customerId] })');
    expect(table).toMatch(/customers: r\.many\.customer\(\{\s*from: r\.activity\.id\.through\(r\.activityCustomer\.activityId\)/);
    expect(table).toMatch(/customer: \{\s*activities: r\.many\.activity\(\{\s*from: r\.customer\.id\.through\(r\.activityCustomer\.customerId\)/);
  });

  it("doesn't edit the Better Auth tables", () => {
    expect(() => addField(diskChanges(root), 'users', spec('nickname', 'string'))).toThrow(/Better Auth/);
  });

  it('refuses a column that exists', () => {
    expect(() => addField(diskChanges(root), 'activities', spec('createdAt', 'datetime'))).toThrow(/already has/);
  });
});

describe('field remove', () => {
  const clean = () => read(`${TABLES}/activities.ts`).replace(/\s+/g, ' ');
  let original: string;
  beforeEach(async () => {
    await run((c) => c.update(`${TABLES}/activities.ts`, (s) => `${s}\n`, { format: true }));
    original = clean();
  });

  it('removes a plain column and its index', async () => {
    await run((c) => addField(c, 'activities', spec('status', 'string', { index: true })));
    await run((c) => removeField(c, 'activities', 'status'));
    expect(clean()).toBe(original);
  });

  it('removes a key with its relations, index and import', async () => {
    await run((c) => addField(c, 'activities', spec('customer', 'ref', { to: 'customers' })));
    await run((c) => removeField(c, 'activities', 'customer'));
    expect(clean()).toBe(original);
  });

  it('removes a many-to-many with its junction table', async () => {
    await run((c) => addField(c, 'activities', spec('customers', 'ref', { to: 'customers', relation: 'many-to-many' })));
    await run((c) => removeField(c, 'activities', 'customers'));
    expect(clean()).toBe(original);
  });

  it('removes a one-to-many from the table that declares it, via the key on the other one', async () => {
    await run((c) => addField(c, 'customers', spec('tasks', 'ref', { to: 'activities', relation: 'one-to-many' })));
    await run((c) => removeField(c, 'customers', 'tasks'));
    expect(clean()).toBe(original);
  });

  it('says when there is nothing to remove', () => {
    expect(() => removeField(diskChanges(root), 'activities', 'nope')).toThrow(/no "nope"/);
  });
});

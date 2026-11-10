import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resourceNames } from '../src/core/names.ts';
import { childRoles, syncContract } from '../src/sync/contract.ts';
import { rolesOf } from '../src/sync/roles.ts';
import { readTable } from '../src/sync/table.ts';
import { renderBackend } from '../src/pieces/backend.ts';

const FIXTURE = join(import.meta.dirname, 'fixtures', 'project', 'packages', 'backend');
const fixture = (path: string) => readFileSync(join(FIXTURE, path), 'utf8');

const activity = resourceNames('activity');
/** The generated table, with the columns added after it was generated. */
const activityTable = (extra: string) =>
  renderBackend('table.ts', activity).replace(
    "id: serial('id').primaryKey(),",
    `id: serial('id').primaryKey(),\n    name: varchar('name', { length: 255 }).notNull(),\n${extra}`,
  );

/** The contract of a resource generated with a `name` field (the template has none). */
const generated = () =>
  syncContract('contracts/activities.ts', renderBackend('contract.ts', activity), activity, readTable('tables/activities.ts', activityTable(''), activity))
    .content;

function sync(table: string, contract = generated()) {
  const info = readTable('tables/activities.ts', table, activity);
  return { info, ...syncContract('contracts/activities.ts', contract, activity, info) };
}

describe('readTable', () => {
  it('reads types, nullability, lengths, enums and tags', () => {
    const { info } = sync(
      activityTable(`
    type: text({ enum: ['email', 'phone'] }).notNull(),
    /** @api internal */
    testinternal: varchar('testinternal', { length: 10 }),
    score: integer('score').default(0).notNull(),`),
    );
    const byKey = Object.fromEntries(info.columns.map((c) => [c.key, c]));
    expect(byKey.type).toMatchObject({ kind: 'enum', enumValues: ['email', 'phone'], notNull: true });
    expect(byKey.testinternal).toMatchObject({ kind: 'string', length: 10, notNull: false });
    expect([...byKey.testinternal.tags]).toEqual(['internal']);
    expect(byKey.score).toMatchObject({ kind: 'int', hasDefault: true });
    expect(byKey.updatedAt.serverManaged).toBe(true);
    expect(info.relations).toEqual(['createdBy', 'updatedBy']);
  });

  it('reads @form next to @api, and warns about misuse', () => {
    const { info } = sync(
      activityTable(`
    /** @api detail @form editor */
    description: text('description'),
    /** @form editor */
    code: varchar('code', { length: 10 }),
    /** @form fancy */
    notes: text('notes'),`),
    );
    const byKey = Object.fromEntries(info.columns.map((c) => [c.key, c]));
    expect(byKey.description.formInput).toBe('editor');
    expect([...byKey.description.tags]).toEqual(['detail']);
    expect(byKey.notes.formInput).toBeUndefined();
    const warnings = info.warnings.join('\n');
    expect(warnings).toMatch(/"@form editor" on "code" is ignored/);
    expect(warnings).toMatch(/unknown tag "@form fancy"/);
  });

  it('warns about a misspelled option', () => {
    const { info } = sync(activityTable(`    code: varchar('code', { lenght: 10 }),`));
    expect(info.warnings.join()).toMatch(/did you mean "length"/);
  });
});

describe('rolesOf', () => {
  it('follows the customers contract', () => {
    const { info } = sync(activityTable(''));
    const roles = Object.fromEntries(info.columns.map((c) => [c.key, rolesOf(c)]));
    expect(roles.id).toMatchObject({ body: false, listed: true, filter: true, sort: true });
    expect(roles.name).toMatchObject({ body: true, listed: true, filter: true, sort: true });
    expect(roles.createdAt).toMatchObject({ body: false, listed: true, filter: false, sort: true });
    expect(roles.deletedAt).toMatchObject({ body: false, listed: false, detail: true });
    expect(Object.values(roles.createdById).some(Boolean)).toBe(false);
  });

  it('keeps the id a filter and a sort field, whatever its type, unless tagged', () => {
    const roles = (id: string) => rolesOf(readTable('t.ts', activityTable('').replace("serial('id').primaryKey()", id), activity).columns[0]);
    expect(roles("uuid('id').primaryKey().defaultRandom()")).toMatchObject({ filter: true, sort: true });
    expect(roles("varchar('id', { length: 5 }).primaryKey()")).toMatchObject({ filter: true, sort: true });
    const tagged = activityTable('').replace("id: serial('id')", "/** @api nosort nofilter */\n    id: serial('id')");
    expect(rolesOf(readTable('t.ts', tagged, activity).columns[0])).toMatchObject({ filter: false, sort: false });
  });

  it('puts the id back into the sort fields', () => {
    const contract = generated().replace("_SORT_FIELDS = ['id', ", "_SORT_FIELDS = [");
    expect(sync(activityTable(''), contract).content).toContain("ACTIVITY_SORT_FIELDS = ['id', 'name', 'createdAt', 'updatedAt']");
  });
});

describe('syncContract', () => {
  it('leaves an up-to-date contract alone (customers, with its addresses)', () => {
    const table = fixture('database/src/tables/customers.ts');
    const contract = fixture('../contracts/src/customers.ts');
    const names = resourceNames('customer');
    const info = readTable('customers.ts', table, names);
    const { report } = syncContract('customers.ts', contract, names, info);
    expect(report.added).toEqual([]);
    expect(report.removed).toEqual([]);
    expect(report.unknown).toEqual([]);
  });

  it('adds new columns in table order, leaving out internal ones', () => {
    const { content, report } = sync(
      activityTable(`
    type: text({ enum: ['email', 'phone'] }).notNull(),
    /** @api internal */
    testinternal: varchar('testinternal', { length: 10 }),`),
    );
    expect(content).not.toContain('testinternal');
    expect(content).toContain("export const ACTIVITY_TYPES = ['email', 'phone'] as const;");
    expect(content).toContain("type: z.enum(ACTIVITY_TYPES, { error: msg('activities.type.required') })");
    expect(content).toContain("['id', 'name', 'type', 'createdAt', 'updatedAt']");
    expect(content).toContain("['id', 'name', 'type'] as const");
    expect(content).toContain('id: z.string().regex(/^\\s*\\d{0,9}\\s*$/).optional()');
    expect(content).toContain('type: z.enum(ACTIVITY_TYPES).optional()');
    expect(content).toMatch(/name: string;\s+type: ActivityType;\s+createdAt: Date;/);
    expect(report.required).toEqual(['type']);
  });

  it('keeps hand-written validation and drops columns that became internal', () => {
    const contract = generated()
      .replace("requiredText(255, msg('activities.name.required'))", "requiredText(100, 'Name it')")
      .replace("name: requiredText(100, 'Name it'),", "name: requiredText(100, 'Name it'),\n  code: optionalText(z.string().max(10)),");
    const { content, report } = sync(
      activityTable(`    /** @api internal */\n    code: varchar('code', { length: 10 }),`),
      contract,
    );
    expect(content).toContain("requiredText(100, 'Name it')");
    expect(content).not.toContain('code:');
    expect(report.removed).toContain('body: code');
  });

  it('flags members that are no longer columns', () => {
    const contract = generated().replace(
      'name: string;\n',
      'name: string;\n  legacy: string;\n',
    );
    const { content, report } = sync(activityTable(''), contract);
    expect(content).toContain('legacy: string;');
    expect(report.unknown).toEqual(['ListedActivity: legacy']);
  });

  it('is idempotent', () => {
    const table = activityTable(`    type: text({ enum: ['email', 'phone'] }).notNull(),`);
    const once = sync(table).content;
    const twice = sync(table, once);
    expect(twice.report.added).toEqual([]);
    expect(twice.report.removed).toEqual([]);
  });
});

describe('syncContract layout', () => {
  it('writes the members it touches at their depth, without Prettier', () => {
    const { content } = sync(activityTable(`    /** @api detail */\n    notes: text('notes'),`));
    expect(content).toMatch(/BodySchema = z\.strictObject\(\{\n  name: [^\n]*,\n  notes: [^\n]*,\n\}\);/);
    expect(content).toMatch(/export interface ActivityDetail extends ListedActivity \{\n(  [^\n]*\n)+\}/);
    expect(content).not.toMatch(/\n(name|notes|id|createdAt): /);
  });

  it('fixes members a previous run left at column 0', () => {
    const broken = generated().replace(/\n  name: /, '\nname: ');
    const { content } = sync(activityTable(''), broken);
    expect(content).toMatch(/\n  name: requiredText/);
    expect(content).not.toMatch(/\nname: /);
  });
});

describe('childRoles', () => {
  const item = resourceNames('sales-order-item');
  const table = (parentKey: string) => `export const salesOrderItem = salesSchema.table('sales_order_item', {
    ${parentKey}: integer('order_id').notNull().references(() => salesOrder.id, { onDelete: 'cascade' }),
    productId: integer('product_id').notNull().references(() => product.id),
    quantity: integer('quantity').notNull(),
    position: integer('position').notNull(),
  });`;
  const body = (parentKey: string) =>
    readTable('t.ts', table(parentKey), item)
      .columns.filter((c) => childRoles(c, 'salesOrder').body)
      .map((c) => c.key);

  it('leaves the key to the parent and the position out of the body, whatever the key is named', () => {
    expect(body('orderId')).toEqual(['productId', 'quantity']);
    expect(body('salesOrderId')).toEqual(['productId', 'quantity']);
  });

  it('puts a position tagged @api input in the body', () => {
    const tagged = table('orderId').replace("    position:", "    /** @api input */\n    position:");
    const keys = readTable('t.ts', tagged, item).columns.filter((c) => childRoles(c, 'salesOrder').body).map((c) => c.key);
    expect(keys).toEqual(['productId', 'quantity', 'position']);
  });
});

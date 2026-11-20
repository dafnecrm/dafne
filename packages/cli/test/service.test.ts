import { resourceNames } from '../src/core/names.ts';
import { syncChildService, syncService } from '../src/sync/service.ts';
import { childRoles } from '../src/sync/contract.ts';
import { readTable } from '../src/sync/table.ts';
import { renderBackend } from '../src/pieces/backend.ts';

const names = resourceNames('activity');
const tableWith = (extra: string) =>
  readTable(
    'activities.ts',
    renderBackend('table.ts', names).replace(
      "id: serial('id').primaryKey(),",
      `id: serial('id').primaryKey(),\n    name: varchar('name', { length: 255 }).notNull(),\n${extra}`,
    ),
    names,
  );
const service = () => renderBackend('service.ts', names);

describe('syncService', () => {
  it('adds new columns to the list, the insert and the update, in table order', () => {
    const table = tableWith(`
    type: text({ enum: ['email', 'phone'] }).notNull(),
    /** @api readonly */
    status: text('status', { enum: ['open', 'done'] }).notNull().default('open'),`);
    const { content, report } = syncService('s.ts', service(), names, table);
    expect(content).toMatch(/name: activity\.name,\s*type: activity\.type,\s*status: activity\.status,\s*createdAt: activity\.createdAt/);
    expect(content).toMatch(/name: body\.name,\s*type: body\.type,\s*createdAt: now/);
    expect(content).toMatch(/\.set\(\{\s*name: body\.name,\s*type: body\.type,\s*updatedById: actor.id/);
    // readonly: in the list, not saved from the body.
    expect(content).not.toContain('status: body.status');
    expect(report.added).toContain('list select: status');
  });

  it('leaves internal columns out of the detail and the list', () => {
    const table = tableWith(`
    /** @api internal */
    secret: varchar('secret', { length: 10 }),`);
    const { content } = syncService('s.ts', service(), names, table);
    expect(content).toMatch(/columns: \{\s*secret: false,\s*createdById: false,\s*updatedById: false\s*\}/);
    expect(content).not.toContain('secret: activity.secret');
    // Not in the contract, so not in the body either.
    expect(content).not.toContain('secret: body.secret');
  });

  it('removes dropped columns, but not hand-written values', () => {
    const table = tableWith(`    code: varchar('code', { length: 10 }),`);
    const once = syncService('s.ts', service(), names, table).content.replace(
      'updatedById: actor.id,\n          // The time',
      'updatedById: actor.id,\n          name2: body.name.toUpperCase(),\n          // The time',
    );
    const { content, report } = syncService('s.ts', once, names, tableWith(''), ['code']);
    expect(content).not.toContain('code: activity.code');
    expect(content).not.toContain('code: body.code');
    expect(content).toContain('name2: body.name.toUpperCase()');
    expect(report.removed).toEqual([
      'list select: code',
      'create insert values: code',
      'update update set: code',
    ]);
  });

  it('leaves @api nosave columns out of the insert and the update, and takes them out', () => {
    const table = tableWith(`
    /** @api nosave */
    status: text('status', { enum: ['open', 'done'] }).notNull().default('open'),`);
    const { content, report } = syncService('s.ts', service(), names, table);
    // In the list (a response), never written from the body: a state machine moves it.
    expect(content).toContain('status: activity.status');
    expect(content).not.toContain('status: body.status');
    expect(report.added).not.toContain('create insert values: status');

    const written = content.replace('name: body.name,', 'name: body.name,\n            status: body.status,');
    const again = syncService('s.ts', written, names, table);
    expect(again.content).not.toContain('status: body.status');
    expect(again.report.removed).toContain('create insert values: status');
  });

  it('adds nothing to an insert or update that spreads the body', () => {
    // The generated service with its `name`, then spread by hand.
    const spread = syncService('s.ts', service(), names, tableWith('')).content.replaceAll('name: body.name,', '...body,');
    expect(spread).toContain('...body,');
    const table = tableWith(`    type: text({ enum: ['email', 'phone'] }).notNull(),`);
    const { content, report } = syncService('s.ts', spread, names, table);
    expect(content).not.toContain('type: body.type');
    expect(report.added.filter((line) => /insert values|update set/.test(line))).toEqual([]);
  });

  it('is idempotent', () => {
    const table = tableWith(`    type: text({ enum: ['email', 'phone'] }).notNull(),`);
    const once = syncService('s.ts', service(), names, table).content;
    const twice = syncService('s.ts', once, names, table);
    expect(twice.content).toBe(once);
    expect(twice.report.added).toEqual([]);
  });

  it('matches the keys to other records exactly, and drops those no longer filters', () => {
    const table = tableWith(`
    customerId: integer('customer_id').references(() => customer.id),
    ownerId: varchar('owner_id', { length: 12 }).references(() => owner.id),`);
    const { content } = syncService('s.ts', service(), names, table);
    expect(content).toMatch(/EXACT_FILTERS[^\n]*> = \{\s*id: Number,\s*customerId: Number,\s*ownerId: String,?\s*\}/);
    expect(content).toContain('const exact = EXACT_FILTERS[field];');

    const tagged = tableWith(`
    /** @api nofilter */
    customerId: integer('customer_id').references(() => customer.id),
    ownerId: varchar('owner_id', { length: 12 }).references(() => owner.id),`);
    expect(syncService('s.ts', content, names, tagged).content).toMatch(/EXACT_FILTERS[^\n]*> = \{\s*id: Number,\s*ownerId: String,?\s*\}/);
  });

  it('gives a service from before EXACT_FILTERS the map', () => {
    const old = service()
      .replace(/\/\*\*\n \* Filters matched exactly[\s\S]*?\n\};\n\n/, '')
      .replace('  type ActivityFilterField,\n', '')
      .replace('type Column, ', '')
      .replace(
        /const exact = EXACT_FILTERS\[field\];\n\s*\/\/[^\n]*\n(\s*)return \[[^\n]*\];/,
        "// The id matches exactly (an integer column), the other fields contain the text.\n$1return [\n$1  field === 'id'\n$1    ? eq(activity.id, Number(value))\n$1    : ilike(activity[field], `%${escapeLike(value)}%`),\n$1];",
      );
    expect(old).not.toContain('EXACT_FILTERS');
    const table = tableWith(`    customerId: integer('customer_id').references(() => customer.id),`);
    const { content, report } = syncService('s.ts', old, names, table);
    expect(content).toMatch(/EXACT_FILTERS[^\n]*> = \{\s*id: Number,\s*customerId: Number,?\s*\}/);
    expect(content).toContain('return [exact ? eq(activity[field] as Column, exact(value)) : ilike(activity[field], `%${escapeLike(value)}%`)];');
    expect(content).not.toContain("field === 'id'");
    expect(content).toMatch(/type ActivityFilterField/);
    expect(content).toMatch(/import \{[^}]*type Column[^}]*\} from 'drizzle-orm'/);
    expect(content.indexOf('const EXACT_FILTERS')).toBeLessThan(content.indexOf('const notDeleted'));
    expect(report.added).toContain('list: EXACT_FILTERS (activity)');
  });
});

describe('syncChildService', () => {
  const order = resourceNames('sales-order');
  const items = readTable(
    'sales-orders.ts',
    `export const salesOrderItem = salesSchema.table('sales_order_item', {
    orderId: integer('order_id').notNull().references(() => salesOrder.id, { onDelete: 'cascade' }),
    productId: integer('product_id').notNull().references(() => product.id),
    quantity: integer('quantity').notNull(),
    /** @api readonly */
    price: numeric('price', { precision: 14, scale: 2, mode: 'number' }).notNull(),
  });`,
    resourceNames('sales-order-item'),
  );
  const insert = (body: string) => `export class SalesOrdersService {
  async insertItems(tx: Transaction, orderId: number, items: SalesOrderItemBody[]) {
    await tx.insert(salesOrderItem).values(items.map((item) => (${body})));
  }
}
`;
  const run = (source: string) =>
    syncChildService('s.ts', source, order, items, 'items', (c) => childRoles(c, 'salesOrder'));

  it('saves the body fields of each item', () => {
    const { content } = run(insert('{ orderId }'));
    expect(content).toContain('{ productId: item.productId, quantity: item.quantity, orderId }');
  });

  it('adds nothing to an item spread into the insert', () => {
    const source = insert('{ ...item, orderId }');
    const { content, report } = run(source);
    expect(content).toBe(source);
    expect(report.added).toEqual([]);
  });
});

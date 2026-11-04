import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatSource } from '../src/core/format.js';
import { resourceNames } from '../src/core/names.js';
import { childRoles, syncChildContract } from '../src/sync/contract.js';
import { syncChildService } from '../src/sync/service.js';
import { foreignRelations, readTable } from '../src/sync/table.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');
const read = (path: string) => readFileSync(join(FIXTURES, path), 'utf8');
const TABLE = read('project/packages/backend/database/src/tables/customers.ts');
const CONTRACT = read('project/packages/contracts/src/customers.ts');
// A copy of packages/backend/customers/src/customers.service.ts (addresses with a label).
const SERVICE = read('customers.service.ts');

const customer = resourceNames('customer');
const address = resourceNames('customerAddress');
const LABEL = "label: varchar('label', { length: 100 }),";
const TYPE = "type: mysqlEnum(['head_office', 'shipping', 'billing']),";

function sync(table: string) {
  const info = readTable('customers.ts', table, address);
  const contract = syncChildContract('customers.ts', CONTRACT, address, info, 'customer');
  const service = syncChildService('customers.service.ts', SERVICE, customer, info, 'addresses', (c) => childRoles(c, 'customer'));
  return { info, contract, service };
}

describe('child tables (customer addresses)', () => {
  it('leaves an up-to-date contract and service alone', async () => {
    const { contract, service } = sync(TABLE);
    // The sync rewrites the members it checks; Prettier puts the layout back (as syncOne does).
    expect(await formatSource(join(FIXTURES, 'customers.ts'), contract.content)).toBe(
      await formatSource(join(FIXTURES, 'customers.ts'), CONTRACT),
    );
    expect(contract.report).toMatchObject({ added: [], removed: [], unknown: [], warnings: [] });
    expect(service.content).toBe(SERVICE);
    expect(service.report).toEqual({ added: [], removed: [], warnings: [] });
  });

  it('keeps the key to the parent and the position out of the API', () => {
    const { info } = sync(TABLE);
    const roles = Object.fromEntries(info.columns.map((c) => [c.key, childRoles(c, 'customer')]));
    expect(roles.customerId).toMatchObject({ body: false, listed: false });
    expect(roles.position).toMatchObject({ body: false, listed: false });
    expect(roles.street).toMatchObject({ body: true, listed: true, filter: false, sort: false });
  });

  it('adds a new column and reports the one that left (label → type)', () => {
    const { contract, service } = sync(TABLE.replace(LABEL, TYPE));
    const content = contract.content;
    expect(content).toContain("export const CUSTOMER_ADDRESS_TYPES = ['head_office', 'shipping', 'billing'] as const;");
    expect(content).toContain('export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPES)[number];');
    expect(content).toMatch(/type: z\.enum\(CUSTOMER_ADDRESS_TYPES, \{ error: msg\('customerAddresses.type.required'\) \}\)\s*\.nullish\(\)/);
    expect(content).toMatch(/interface CustomerAddress \{[^}]*type: CustomerAddressType \| null;/);
    // label isn't a column any more, but the CLI can't tell a rename from hand-written code.
    expect(contract.report.unknown).toEqual(['customerAddressBodySchema: label', 'CustomerAddress: label']);

    expect(service.content).toMatch(/position,\s*label: address\.label,\s*type: address\.type,\s*street: address\.street/);
    expect(service.report.added).toEqual(['insert customerAddress values: type']);
    expect(service.report.warnings.join()).toMatch(/label isn't a column of the table: kept/);
  });

  it('follows a column that became NOT NULL, and back', () => {
    // The contract as it was with a nullable type.
    const nullable = TABLE.replace(LABEL, TYPE);
    const before = sync(nullable).contract.content;
    const notNull = readTable('customers.ts', TABLE.replace(LABEL, TYPE.replace('),', ').notNull(),')), address);
    const { content, report } = syncChildContract('customers.ts', before, address, notNull, 'customer');
    expect(content).toMatch(/type: z\.enum\(CUSTOMER_ADDRESS_TYPES, \{ error: msg\('customerAddresses.type.required'\) \}\),/);
    expect(content).toMatch(/interface CustomerAddress \{[^}]*type: CustomerAddressType;/);
    expect(report.required).toEqual(['customerAddress.type']);
    expect(report.warnings.join()).toMatch(/type was generated again because its column is now NOT NULL/);

    const back = syncChildContract('customers.ts', content, address, readTable('customers.ts', nullable, address), 'customer');
    expect(back.content).toMatch(/type: z\.enum\(CUSTOMER_ADDRESS_TYPES, \{ error: msg\('customerAddresses.type.required'\) \}\)\.nullish\(\)/);
    expect(back.content).toMatch(/interface CustomerAddress \{[^}]*type: CustomerAddressType \| null;/);
  });

  it('hides a new internal column from the relation in the detail', () => {
    const table = TABLE.replace(LABEL, `${LABEL}\n    /** @api internal */\n    note: varchar('note', { length: 10 }),`);
    const { service } = sync(table);
    expect(service.content).toMatch(/columns: \{ customerId: false, position: false, note: false \}/);
    expect(service.content).not.toContain('note: address.note');
  });
});

describe('foreignRelations', () => {
  it("reads the reverse relations another table file gives the resource", () => {
    const tasks = `
export const taskRelations = defineRelationsPart({ task, activity }, (r) => ({
  task: { activity: r.one.activity({ from: r.task.activityId, to: r.activity.id }) },
  activity: { tasks: r.many.task({ from: r.activity.id, to: r.task.activityId }) },
}));`;
    expect(foreignRelations('tasks.ts', tasks, 'activity')).toEqual({ tasks: 'task' });
    expect(foreignRelations('tasks.ts', tasks, 'customer')).toEqual({});
  });
});

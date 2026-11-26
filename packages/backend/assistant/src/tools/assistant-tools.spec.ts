import { NotFoundException } from '@nestjs/common';
import type { Tool } from 'ai';
import type { Actor } from '@dafne/backend-crud';
import type { AssistantAction } from '@dafne/contracts';
import { AssistantTools } from './assistant-tools.js';
import { abilityFor } from '@dafne/permissions';
import { WRITE_TOOLS } from './write-tools.js';

const everything = abilityFor({ admin: true, permissions: [] });

const options = { toolCallId: 'call-1', messages: [] } as never;
const run = (tool: Tool | undefined, input: unknown) => tool!.execute!(input as never, options);

function setup() {
  const customers = { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() };
  const salesOrders = { list: vi.fn(), get: vi.fn(), changeSalesOrderStatus: vi.fn() };
  const activities = { list: vi.fn(), get: vi.fn(), create: vi.fn(), changeActivityStatus: vi.fn() };
  const products = { list: vi.fn(), get: vi.fn() };
  const salesOrderTypes = { list: vi.fn() };
  const quotations = { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() };
  const tools = new AssistantTools(customers as never, salesOrders as never, activities as never, products as never, salesOrderTypes as never, quotations as never);
  const propose = vi.fn(async (kind: string, toolCallId: string, payload: Record<string, unknown>) => ({
    id: 7,
    conversationId: 1,
    kind,
    payload,
    status: 'pending',
    result: null,
    createdAt: new Date(),
    decidedAt: null,
  }) as AssistantAction);
  return { customers, salesOrders, activities, products, salesOrderTypes, tools, propose };
}

describe('AssistantTools', () => {
  it('gives an agent only its own tools', () => {
    const { tools, propose } = setup();
    const set = tools.build(['search_customers', 'list_sales_orders'], { conversationId: 1, locale: 'it', propose, ability: everything });
    expect(Object.keys(set)).toEqual(['search_customers', 'list_sales_orders']);
  });

  it('counts open orders of a customer through the orders list', async () => {
    const { tools, salesOrders, propose } = setup();
    salesOrders.list.mockResolvedValue({ items: [], total: 3, limit: 1, offset: 0 });
    const set = tools.build(['list_sales_orders'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await expect(run(set.list_sales_orders, { customerId: 42, status: 'open', limit: 1 })).resolves.toEqual({
      total: 3,
      items: [],
    });
    expect(salesOrders.list).toHaveBeenCalledWith({ customerId: '42', status: 'open', limit: 1 });
  });

  it('turns CRM errors into a result the model can read, in the user language', async () => {
    const { tools, customers, propose } = setup();
    customers.get.mockRejectedValue(new NotFoundException('customers.notFound'));
    const set = tools.build(['get_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await expect(run(set.get_customer, { id: 9 })).resolves.toEqual({ error: 'Cliente non trovato' });
  });

  it('only proposes a new customer: nothing is written', async () => {
    const { tools, customers, propose } = setup();
    const set = tools.build(['propose_create_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });
    const input = { type: 'company', name: 'Rossi Srl', email: 'info@rossi.it' };

    await expect(run(set.propose_create_customer, input)).resolves.toMatchObject({ proposed: true, actionId: 7 });
    expect(propose).toHaveBeenCalledWith('propose_create_customer', 'call-1', { body: { ...input, addresses: [] } });
    expect(customers.create).not.toHaveBeenCalled();
  });

  it('proposes a new customer with its addresses, in Italy unless said otherwise', async () => {
    const { tools, propose } = setup();
    const set = tools.build(['propose_create_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await run(set.propose_create_customer, {
      type: 'company',
      name: 'Rossi Srl',
      email: 'info@rossi.it',
      addresses: [
        { type: 'head_office', street: 'Via Roma 1', city: 'Milano', postalCode: '20100', region: 'MI' },
        { type: 'shipping', street: 'Rue de Rivoli 2', city: 'Paris', countryCode: 'FR' },
      ],
    });
    expect(propose).toHaveBeenCalledWith('propose_create_customer', 'call-1', {
      body: expect.objectContaining({
        addresses: [
          { type: 'head_office', street: 'Via Roma 1', city: 'Milano', postalCode: '20100', region: 'MI', countryCode: 'IT' },
          { type: 'shipping', street: 'Rue de Rivoli 2', city: 'Paris', postalCode: null, region: null, countryCode: 'FR' },
        ],
      }),
    });
  });

  it('refuses two addresses of the same type', async () => {
    const { tools, propose } = setup();
    const set = tools.build(['propose_create_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });

    const result = await run(set.propose_create_customer, {
      type: 'company',
      name: 'Rossi Srl',
      email: 'info@rossi.it',
      addresses: [
        { type: 'billing', street: 'Via Roma 1', city: 'Milano' },
        { type: 'billing', street: 'Via Po 3', city: 'Torino' },
      ],
    });
    expect(result).toMatchObject({ proposed: false });
    expect((result as { error: string }).error).toContain('addresses.1.type');
    expect(propose).not.toHaveBeenCalled();
  });

  it('adds and replaces addresses by type, keeping the others', async () => {
    const { tools, customers, propose } = setup();
    const address = (type: string, street: string) => ({
      id: 1, type, street, city: 'Milano', postalCode: null, region: null, countryCode: 'IT',
    });
    customers.get.mockResolvedValue({
      id: 5, type: 'company', name: 'Rossi Srl', email: 'info@rossi.it', phone: null, birthDate: null,
      fiscalCode: null, vatNumber: null, notes: null,
      addresses: [address('head_office', 'Via Roma 1'), address('billing', 'Via Verdi 2')],
    });
    const set = tools.build(['propose_update_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await run(set.propose_update_customer, {
      id: 5,
      changes: {
        addresses: [
          { type: 'shipping', street: 'Via Po 3', city: 'Torino' },
          { type: 'billing', street: 'Via Manzoni 4', city: 'Milano' },
        ],
      },
    });
    const payload = propose.mock.calls[0]![2] as { body: { addresses: { type: string; street: string }[] } };
    expect(payload.body.addresses.map(({ type, street }) => [type, street])).toEqual([
      ['head_office', 'Via Roma 1'],
      ['billing', 'Via Manzoni 4'],
      ['shipping', 'Via Po 3'],
    ]);
  });

  it("refuses a proposal the contract rejects, telling the model why", async () => {
    const { tools, propose } = setup();
    const set = tools.build(['propose_create_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });

    const result = await run(set.propose_create_customer, { type: 'company', name: 'Rossi Srl', email: 'not-an-email' });
    expect(result).toMatchObject({ proposed: false });
    expect((result as { error: string }).error).toContain('email');
    expect(propose).not.toHaveBeenCalled();
  });

  it('proposes a customer change on top of the current data', async () => {
    const { tools, customers, propose } = setup();
    customers.get.mockResolvedValue({
      id: 5, type: 'company', name: 'Rossi Srl', email: 'info@rossi.it', phone: null, birthDate: null,
      fiscalCode: null, vatNumber: null, notes: null, addresses: [],
    });
    const set = tools.build(['propose_update_customer'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await run(set.propose_update_customer, { id: 5, changes: { phone: '+39 06 1234567' } });
    expect(propose).toHaveBeenCalledWith(
      'propose_update_customer',
      'call-1',
      expect.objectContaining({ id: 5, changes: { phone: '+39 06 1234567' }, body: expect.objectContaining({ name: 'Rossi Srl', phone: '+39 06 1234567' }) }),
    );
  });
});

describe('permissions', () => {
  it("leaves out the write tools the user isn't allowed", () => {
    const { tools, propose } = setup();
    const ability = abilityFor({ admin: false, permissions: ['Activity.create'] });
    const set = tools.build(['search_customers', 'propose_create_customer', 'propose_create_activity'], {
      conversationId: 1,
      locale: 'it',
      propose,
      ability,
    });
    expect(Object.keys(set)).toEqual(['search_customers', 'propose_create_activity']);
  });
});

describe('search_customers', () => {
  it('asks the model to check with the user when several customers match', async () => {
    const { tools, customers, propose } = setup();
    customers.list.mockResolvedValue({
      items: [
        { id: 1, type: 'company', name: 'Rossi Srl', email: 'a@b.it', phone: null },
        { id: 2, type: 'person', name: 'Rossi Mario', email: 'c@d.it', phone: null },
      ],
      total: 2,
      limit: 10,
      offset: 0,
    });
    const set = tools.build(['search_customers'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await expect(run(set.search_customers, { query: 'Rossi' })).resolves.toHaveProperty('note');
    await expect(run(set.search_customers, { query: 'rossi srl' })).resolves.not.toHaveProperty('note');
  });
});

describe('propose_create_sales_order', () => {
  it('proposes a draft order with the only active type and numbered lines', async () => {
    const { tools, customers, products, salesOrderTypes, salesOrders, propose } = setup();
    customers.list.mockResolvedValue({ items: [{ id: 1, name: 'Panineto Srl' }], total: 1 });
    salesOrderTypes.list.mockResolvedValue({ items: [{ id: 'STD', description: 'Standard' }], total: 1 });
    products.list.mockImplementation(async ({ name }: { name: string }) => ({
      items: [{ id: name === 'insalata' ? 5 : 6, name: name === 'insalata' ? 'Insalata' : 'Artemisia' }],
      total: 1,
    }));
    const set = tools.build(['propose_create_sales_order'], { conversationId: 1, locale: 'it', propose, ability: everything });

    await run(set.propose_create_sales_order, {
      customer: 'panineto srl',
      items: [{ product: 'insalata', quantity: 10 }, { product: 'artemisia', quantity: 9 }],
    });
    expect(propose).toHaveBeenCalledWith('propose_create_sales_order', 'call-1', {
      body: {
        customerId: 1,
        typeId: 'STD',
        notes: null,
        items: [
          { productId: 5, quantity: 10, position: 1 },
          { productId: 6, quantity: 9, position: 2 },
        ],
      },
      customer: 'Panineto Srl',
      type: 'Standard',
      lines: [{ product: 'Insalata', quantity: 10 }, { product: 'Artemisia', quantity: 9 }],
    });
    expect(salesOrders).not.toHaveProperty('create');
  });

  it('asks which type when several are active', async () => {
    const { tools, customers, products, salesOrderTypes, propose } = setup();
    customers.list.mockResolvedValue({ items: [{ id: 1, name: 'Panineto Srl' }], total: 1 });
    products.list.mockResolvedValue({ items: [{ id: 5, name: 'Insalata' }], total: 1 });
    salesOrderTypes.list.mockResolvedValue({
      items: [{ id: 'STD', description: 'Standard' }, { id: 'URG', description: 'Urgente' }],
      total: 2,
    });
    const set = tools.build(['propose_create_sales_order'], { conversationId: 1, locale: 'it', propose, ability: everything });

    const result = await run(set.propose_create_sales_order, { customer: 'Panineto Srl', items: [{ product: 'Insalata', quantity: 1 }] });
    expect(result).toMatchObject({ proposed: false, error: expect.stringContaining('URG') });
    expect(propose).not.toHaveBeenCalled();
  });

  it('asks which customer when the name matches several', async () => {
    const { tools, customers, propose } = setup();
    customers.list.mockResolvedValue({ items: [{ id: 1, name: 'Rossi Srl' }, { id: 2, name: 'Rossi Mario' }], total: 2 });
    const set = tools.build(['propose_create_sales_order'], { conversationId: 1, locale: 'it', propose, ability: everything });

    const result = await run(set.propose_create_sales_order, { customer: 'Rossi', items: [{ product: 'Insalata', quantity: 1 }] });
    expect(result).toMatchObject({ proposed: false, error: expect.stringContaining('Rossi Mario') });
  });
});

describe('WRITE_TOOLS.run', () => {
  it('writes a confirmed customer as the user who confirmed it', async () => {
    const { tools, customers } = setup();
    customers.create.mockResolvedValue({ id: 42 });
    const actor = { id: 'u1' } as Actor;

    await expect(
      WRITE_TOOLS.propose_create_customer.run(
        { body: { type: 'company', name: 'Rossi Srl', email: 'info@rossi.it' } },
        tools.services,
        actor,
      ),
    ).resolves.toEqual({ resource: 'customers', id: 42 });
    expect(customers.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rossi Srl' }), actor);
  });

  it('closes an activity as the user', async () => {
    const { tools, activities } = setup();
    await WRITE_TOOLS.propose_close_activity.run({ id: 3 }, tools.services, { id: 'u1' } as Actor);
    expect(activities.changeActivityStatus).toHaveBeenCalledWith(3, 'closed', { id: 'u1' });
  });
});

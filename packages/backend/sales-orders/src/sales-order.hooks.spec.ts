import { Logger } from '@nestjs/common';
import type { TransitionContext } from '@dafne/backend-fsm';
import type { CrudHookContext } from '@dafne/backend-crud';
import type { SalesOrderBody, SalesOrderDetail, SalesOrderStatus } from '@dafne/contracts';
import { SalesOrderIsDraftHook, SalesOrderLogPostHook, SalesOrderLogPreHook } from './sales-order.hooks.js';

describe('sales order hooks', () => {
  const context = { id: 7, from: 'draft', to: 'open', user: { id: 'u1' } } as TransitionContext<SalesOrderStatus, number>;

  beforeEach(() => vi.restoreAllMocks());

  it('logs the transition before it runs', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    new SalesOrderLogPreHook().run(context);
    expect(log).toHaveBeenCalledWith('Sales order 7: draft → open starting (user u1) - pre hook');
  });

  it('logs the transition once done', () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    new SalesOrderLogPostHook().run(context);
    expect(log).toHaveBeenCalledWith('Sales order 7: draft → open done - post hook');
  });
});

describe('SalesOrderIsDraftHook', () => {
  const hook = new SalesOrderIsDraftHook();

  const previous = (status: SalesOrderStatus) =>
    ({
      id: 7,
      status,
      notes: 'old',
      customerId: 1,
      typeId: 'STD',
      items: [
        { position: 1, productId: 10, quantity: 2, uomId: 'pc', product: { id: 10, name: 'A', uom: { id: 'pc', name: 'piece' } } },
        { position: 2, productId: 11, quantity: 1, uomId: 'box', product: { id: 11, name: 'B', uom: { id: 'kg', name: 'kilogram' } } },
      ],
    }) as unknown as SalesOrderDetail;

  const body = (changes: Partial<SalesOrderBody> = {}): SalesOrderBody => ({
    notes: 'old',
    customerId: 1,
    typeId: 'STD',
    items: [
      { position: 1, productId: 10, quantity: 2, uomId: 'pc' },
      { position: 2, productId: 11, quantity: 1, uomId: 'box' },
    ],
    ...changes,
  });

  const run = (status: SalesOrderStatus, changes?: Partial<SalesOrderBody>) =>
    hook.run({
      operation: 'update',
      previous: previous(status),
      body: body(changes),
    } as CrudHookContext<number, SalesOrderBody, SalesOrderDetail>);

  it('lets a draft change anything', () => {
    expect(run('draft', { customerId: 2, typeId: 'X', items: [] })).toBeUndefined();
  });

  it('lets an order that is not a draft be saved unchanged', () => {
    expect(run('open')).toBeUndefined();
  });

  it('lets an order that is not a draft change its notes', () => {
    expect(run('open', { notes: 'new' })).toBeUndefined();
  });

  it('ignores the status (the state machine checks it)', () => {
    expect(run('open', { status: 'draft' })).toBeUndefined();
  });

  it('ignores the order of the items', () => {
    expect(run('open', { items: [...body().items].reverse() })).toBeUndefined();
  });

  it('reads an item without a unit as in its product base unit', () => {
    const [first, second] = body().items;
    expect(run('open', { items: [{ ...first, uomId: null }, second] })).toBeUndefined();
    expect(run('open', { items: [first, { ...second, uomId: null }] })).toBe('salesOrders.status.mustBeDraft');
  });

  it.each<[string, Partial<SalesOrderBody>]>([
    ['customerId', { customerId: 2 }],
    ['typeId', { typeId: 'X' }],
    ['an item quantity', { items: [{ position: 1, productId: 10, quantity: 3, uomId: 'pc' }, { position: 2, productId: 11, quantity: 1, uomId: 'box' }] }],
    ['an item product', { items: [{ position: 1, productId: 12, quantity: 2, uomId: 'pc' }, { position: 2, productId: 11, quantity: 1, uomId: 'box' }] }],
    ['an item unit', { items: [{ position: 1, productId: 10, quantity: 2, uomId: 'dz' }, { position: 2, productId: 11, quantity: 1, uomId: 'box' }] }],
    ['the items', { items: [] }],
  ])('rejects a change of %s when not a draft', (_, changes) => {
    expect(run('open', changes)).toBe('salesOrders.status.mustBeDraft');
  });
});

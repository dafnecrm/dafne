import { NotFoundException } from '@nestjs/common';
import type { CrudHookContext } from '@dafne/backend-crud';
import type { Transaction, TransitionContext } from '@dafne/backend-fsm';
import type { QuotationBody, QuotationDetail, QuotationStatus } from '@dafne/contracts';
import type { SessionUser } from '@dafne/backend-session';
import type { SalesOrdersService } from '../sales-orders.service.js';
import { CreateSalesOrderFromQuotation, QuotationIsDraftHook } from './quotation.hooks.js';
import { QUOTATION_STATES } from './quotation.states.js';
import { QuotationHasItemsGuard } from './quotation.guards.js';

describe('CreateSalesOrderFromQuotation', () => {
  const user = { id: 'u1' } as SessionUser;
  const findFirst = vi.fn();
  const tx = { query: { quotation: { findFirst } } } as unknown as Transaction;
  const salesOrders = { create: vi.fn() };
  const hook = new CreateSalesOrderFromQuotation(salesOrders as unknown as SalesOrdersService);
  const context = (changes: Partial<TransitionContext<QuotationStatus, number>> = {}) =>
    ({ id: 7, from: 'sent', to: 'accepted', tx, user, ...changes }) as TransitionContext<QuotationStatus, number>;

  beforeEach(() => vi.resetAllMocks());

  it("creates the quotation's sales order, with its items at its prices, in the transition's transaction", async () => {
    const items = [
      { position: 1, productId: 10, quantity: 2, uomId: 'box', price: 60 },
      { position: 2, productId: 11, quantity: 1, uomId: 'pc', price: 3.5 },
    ];
    findFirst.mockResolvedValue({ customerId: 3, typeId: 'STD', notes: 'n', items });

    await hook.run(context());

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7, deletedAt: { isNull: true } } }));
    expect(salesOrders.create).toHaveBeenCalledOnce();
    expect(salesOrders.create).toHaveBeenCalledWith(
      {
        customerId: 3,
        typeId: 'STD',
        notes: 'n',
        items: [
          { position: 1, productId: 10, quantity: 2, uomId: 'box' },
          { position: 2, productId: 11, quantity: 1, uomId: 'pc' },
        ],
      },
      user,
      { tx, quotationId: 7, prices: items },
    );
  });

  it('throws 404 when the quotation is gone', async () => {
    findFirst.mockResolvedValue(undefined);

    await expect(hook.run(context())).rejects.toThrow(NotFoundException);
    expect(salesOrders.create).not.toHaveBeenCalled();
  });

  it('needs a user, the sales order creator', async () => {
    await expect(hook.run(context({ user: undefined }))).rejects.toThrow(/needs a user/);
    expect(salesOrders.create).not.toHaveBeenCalled();
  });
});

describe('QUOTATION_STATES', () => {
  it('creates the sales order only when a sent quotation is accepted', () => {
    expect(QUOTATION_STATES.sent?.accepted?.post).toEqual([CreateSalesOrderFromQuotation]);
    expect(QUOTATION_STATES.draft?.accepted).toBeUndefined();
  });

  it('keeps accepted, rejected and expired final: a quotation is accepted once', () => {
    expect(QUOTATION_STATES.accepted).toBeUndefined();
    expect(QUOTATION_STATES.rejected).toBeUndefined();
    expect(QUOTATION_STATES.expired).toBeUndefined();
  });

  it('needs items to send or accept', () => {
    expect(QUOTATION_STATES.draft?.sent?.guards).toEqual([QuotationHasItemsGuard]);
    expect(QUOTATION_STATES.sent?.accepted?.guards).toEqual([QuotationHasItemsGuard]);
  });
});

describe('QuotationIsDraftHook', () => {
  const hook = new QuotationIsDraftHook();
  const item = { position: 1, productId: 10, quantity: 2, uomId: 'pc' };
  const previous = (status: QuotationStatus) =>
    ({
      id: 7,
      status,
      notes: 'old',
      customerId: 1,
      typeId: 'STD',
      validUntil: null,
      items: [{ ...item, product: { id: 10, name: 'A', uom: { id: 'pc', name: 'piece' } } }],
    }) as unknown as QuotationDetail;
  const run = (status: QuotationStatus, changes: Partial<QuotationBody> = {}) =>
    hook.run({
      operation: 'update',
      previous: previous(status),
      body: { notes: 'old', customerId: 1, typeId: 'STD', validUntil: null, items: [item], ...changes },
    } as CrudHookContext<number, QuotationBody, QuotationDetail>);

  it('lets a draft change anything', () => {
    expect(run('draft', { customerId: 2, items: [] })).toBeUndefined();
  });

  it('lets a sent quotation change its notes only', () => {
    expect(run('sent', { notes: 'new' })).toBeUndefined();
    expect(run('sent', { validUntil: new Date('2027-01-01') })).toBe('quotations.status.mustBeDraft');
    expect(run('sent', { items: [{ ...item, quantity: 3 }] })).toBe('quotations.status.mustBeDraft');
  });
});

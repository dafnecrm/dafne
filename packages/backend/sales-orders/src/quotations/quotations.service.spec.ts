import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { quotationBodySchema, type QuotationBodyInput } from '@dafne/contracts';
import { getStateMachineToken } from '@dafne/backend-fsm';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { ProductsService } from '@dafne/backend-products';
import type { SessionUser } from '@dafne/backend-session';
import { QuotationsService } from './quotations.service.js';
import { QUOTATION_STATE_MACHINE } from './quotation.transition.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: Partial<QuotationBodyInput> = {}) =>
  quotationBodySchema.parse({ customerId: 1, typeId: 'STD', validUntil: '2026-01-01', ...input });

const { quotation, quotationItem } = schema;
const notDeleted = isNull(quotation.deletedAt);

describe('QuotationsService', () => {
  let service: QuotationsService;
  const rows = [{ id: 1, status: 'draft' }];
  // Chainable stand-in for db.select().from().innerJoin().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values().returning(), update().set().where() and delete().where()
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const remove = { where: vi.fn() };
  const findFirst = vi.fn();
  const findFirstItem = vi.fn();
  const db = {
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    // Runs the callback with the db itself as the transaction.
    transaction: vi.fn(),
    query: {
      quotation: { findFirst },
      quotationItem: { findFirst: findFirstItem },
    },
  };
  const found = { id: 1, status: 'draft', items: [], salesOrder: null };
  const stateMachine = { transition: vi.fn() };
  const products = { units: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    db.select.mockReturnValue(select);
    select.from.mockReturnValue(select);
    select.innerJoin.mockReturnValue(select);
    select.where.mockReturnValue(select);
    select.orderBy.mockReturnValue(select);
    select.limit.mockReturnValue(select);
    select.offset.mockResolvedValue(rows);
    db.$count.mockResolvedValue(42);
    db.insert.mockReturnValue(insert);
    insert.values.mockReturnValue(insert);
    insert.returning.mockResolvedValue([{ id: 1 }]);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue({ rowCount: 1 });
    db.delete.mockReturnValue(remove);
    remove.where.mockResolvedValue({ rowCount: 0 });
    db.transaction.mockImplementation((callback: (tx: typeof db) => unknown) => callback(db));
    findFirst.mockResolvedValue(found);
    // Every product is sold by the piece, and by the box of 12.
    products.units.mockResolvedValue([
      { uomId: 'pc', uom: { id: 'pc', name: 'piece' }, factor: 1, source: 'base', price: 2.5 },
      { uomId: 'box', uom: { id: 'box', name: 'box' }, factor: 12, source: 'product', price: 30 },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
        { provide: getStateMachineToken(QUOTATION_STATE_MACHINE), useValue: stateMachine },
        { provide: ProductsService, useValue: products },
      ],
    }).compile();

    service = module.get(QuotationsService);
  });

  describe('list', () => {
    it('lists quotations that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({ items: rows, total: 42, limit: 20, offset: 0 });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(quotation);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(quotation, where);
      expect(select.orderBy).toHaveBeenCalledWith(desc(quotation.id), asc(quotation.id));
    });

    it('filters by customer and status, the keys exactly', async () => {
      await service.list({ customerId: ' 3 ', status: 'sent' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, expect.anything(), eq(quotation.customerId, 3)),
      );
    });

    it('pages and sorts', async () => {
      await service.list({ limit: 5, offset: 10, sortBy: 'validUntil', sortDirection: 'asc' });

      expect(select.orderBy).toHaveBeenCalledWith(asc(quotation.validUntil), asc(quotation.id));
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns a quotation that is not deleted, with its items and sales order', async () => {
      findFirst.mockResolvedValue({ ...found, salesOrder: { id: 9, status: 'draft' } });

      await expect(service.get(1)).resolves.toMatchObject({ id: 1, salesOrder: { id: 9 } });
      expect(findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, deletedAt: { isNull: true } },
          with: expect.objectContaining({ items: expect.anything(), salesOrder: expect.anything() }),
        }),
      );
    });

    it('answers null for a quotation without a sales order', async () => {
      findFirst.mockResolvedValue({ ...found, salesOrder: undefined });

      await expect(service.get(1)).resolves.toMatchObject({ salesOrder: null });
    });

    it('throws 404 when the quotation does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQuotationItem', () => {
    it('throws 404 when the item is missing', async () => {
      findFirstItem.mockResolvedValue(undefined);

      await expect(service.getQuotationItem(1, 3)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('inserts the quotation with its creator, born in draft', async () => {
      await expect(
        service.create(body({ notes: 'n', validUntil: '2026-12-31' }), actor('u1')),
      ).resolves.toEqual(found);

      expect(db.insert).toHaveBeenCalledWith(quotation);
      expect(insert.values).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'n',
          customerId: 1,
          typeId: 'STD',
          validUntil: new Date('2026-12-31'),
          createdById: 'u1',
          updatedById: 'u1',
        }),
      );
      expect(stateMachine.transition).not.toHaveBeenCalled();
    });

    it('prices the items as a sales order does', async () => {
      await service.create(
        body({ items: [{ productId: 10, quantity: 2, uomId: 'box', position: 1 }], validUntil: '2026-01-01' }),
        actor('u1'),
      );

      expect(db.insert).toHaveBeenCalledWith(quotationItem);
      expect(insert.values).toHaveBeenLastCalledWith([
        { quotationId: 1, productId: 10, quantity: 2, uomId: 'box', baseQuantity: 24, price: 60, position: 1 },
      ]);
    });

    it('moves a quotation created with another status through the state machine', async () => {
      await service.create(body({ status: 'sent', validUntil: '2026-01-01' }), actor('u1'));

      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'sent', { tx: db, user: actor('u1') });
    });

    it('rejects a unit the product is not sold in', async () => {
      await expect(
        service.create(body({ items: [{ productId: 10, quantity: 1, uomId: 'kg', position: 1 }], validUntil: '2026-01-01' }), actor('u1')),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    const previousItems = [{ position: 1, productId: 10, uomId: 'pc', quantity: 2, price: 4 }];
    const items = [{ productId: 10, quantity: 2, uomId: 'pc', position: 1 }];

    it('updates the quotation, keeping the price of unchanged items', async () => {
      select.where.mockResolvedValueOnce(previousItems);

      await service.update(1, body({ items, validUntil: '2026-01-01' }), actor('u2'));

      expect(db.update).toHaveBeenCalledWith(quotation);
      expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ customerId: 1, updatedById: 'u2' }));
      expect(db.delete).toHaveBeenCalledWith(quotationItem);
      expect(insert.values).toHaveBeenLastCalledWith([expect.objectContaining({ quotationId: 1, price: 4 })]);
    });

    it('prices every item anew with reprice', async () => {
      await service.update(1, body({ items, validUntil: '2026-01-01' }), actor('u2'), { reprice: true });

      expect(insert.values).toHaveBeenLastCalledWith([expect.objectContaining({ price: 5 })]);
    });

    it('throws 404 when the quotation is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.update(99, body(), actor('u2'))).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.delete(1, actor('u3'));

      expect(db.update).toHaveBeenCalledWith(quotation);
      expect(update.set).toHaveBeenCalledWith(expect.objectContaining({ deletedAt: expect.any(Date), updatedById: 'u3' }));
    });

    it('throws 404 when the quotation is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(99, actor('u3'))).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeQuotationStatus', () => {
    it('moves the quotation through its state machine and returns it', async () => {
      const user = { id: 'u1' } as SessionUser;

      await expect(service.changeQuotationStatus(1, 'accepted', user)).resolves.toEqual(found);
      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'accepted', { user });
    });
  });
});

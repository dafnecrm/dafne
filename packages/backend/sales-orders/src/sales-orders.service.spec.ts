import type { SessionUser } from '@dafne/backend-session';
import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { salesOrderBodySchema, type SalesOrderBodyInput } from '@dafne/contracts';
import { getStateMachineToken } from '@dafne/backend-fsm';
import { SalesOrdersService } from './sales-orders.service.js';
import { SALES_ORDER_STATE_MACHINE } from './sales-order.states.js';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { ProductsService } from '@dafne/backend-products';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: SalesOrderBodyInput) => salesOrderBodySchema.parse(input);

const { salesOrder } = schema;
const notDeleted = isNull(salesOrder.deletedAt);

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  const rows = [{ id: 1, name: 'Acme' }];
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
      salesOrder: { findFirst },
      salesOrderItem: { findFirst: findFirstItem },
    },
  };
  const found = { id: 1, name: 'Acme' };
  const stateMachine = { transition: vi.fn(), nextStatuses: vi.fn() };
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
        SalesOrdersService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
        { provide: getStateMachineToken(SALES_ORDER_STATE_MACHINE), useValue: stateMachine },
        { provide: ProductsService, useValue: products },
      ],
    }).compile();

    service = module.get(SalesOrdersService);
  });

  describe('list', () => {
    it('lists sales orders that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(salesOrder);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(salesOrder, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(salesOrder.id),
        asc(salesOrder.id),
      );
    });

    it('filters by id, matching it exactly', async () => {
      await service.list({ id: ' 12 ' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, eq(salesOrder.id, 12)),
      );
    });

    it('pages and sorts', async () => {
      await service.list({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(salesOrder.createdAt),
        asc(salesOrder.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns a sales order that is not deleted, with its users', async () => {
      await expect(service.get(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the sales order does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getSalesOrderItem', () => {
    const product = { id: 7, name: 'Widget' };
    const item = { position: 2, productId: 7, quantity: 3, product };

    it('returns the item of a sales order that is not deleted, with its product', async () => {
      findFirstItem.mockResolvedValue(item);

      await expect(service.getSalesOrderItem(1, 2)).resolves.toEqual(item);
      const options = findFirstItem.mock.calls[0][0];
      expect(options.where).toEqual({
        orderId: 1,
        position: 2,
        salesOrder: { deletedAt: { isNull: true } },
      });
    });

    it('throws 404 when the item or its sales order does not exist', async () => {
      findFirstItem.mockResolvedValue(undefined);

      await expect(service.getSalesOrderItem(1, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const u1 = { id: 'u1' } as SessionUser;
    it('inserts the sales order with its creator', async () => {
      await expect(
        service.create(body({ customerId: 1, typeId: 'T1' }), u1),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
      expect(stateMachine.transition).not.toHaveBeenCalled();
    });

    it("makes a quotation's order in the caller's transaction, at the quotation's prices", async () => {
      const outer = { ...db, outer: true };
      await service.create(
        body({ customerId: 1, typeId: 'T1', items: [{ productId: 4, quantity: 10, uomId: 'pc', position: 1 }] }),
        u1,
        { tx: outer as never, quotationId: 7, prices: [{ position: 1, productId: 4, uomId: 'pc', quantity: 10, price: 19.9 }] },
      );

      expect(db.transaction).not.toHaveBeenCalled();
      expect(insert.values.mock.calls[0][0]).toMatchObject({ quotationId: 7 });
      expect(insert.values.mock.calls[1][0]).toEqual([
        { orderId: 1, productId: 4, quantity: 10, uomId: 'pc', baseQuantity: 10, price: 19.9, position: 1 },
      ]);
    });

    it('leaves quotationId empty for an order entered on its own', async () => {
      await service.create(body({ customerId: 1, typeId: 'T1' }), u1);

      expect(insert.values.mock.calls[0][0]).toMatchObject({ quotationId: null });
    });

    it('inserts its items with the new order id', async () => {
      await service.create(
        body({
          customerId: 1,
          typeId: 'T1',
          items: [
            { productId: 4, quantity: 10, position: 1 },
            { productId: 3, quantity: 9, position: 2 },
          ],
        }),
        u1,
      );

      expect(insert.values.mock.calls[1][0]).toEqual([
        { orderId: 1, productId: 4, quantity: 10, uomId: 'pc', baseQuantity: 10, price: 25, position: 1 },
        { orderId: 1, productId: 3, quantity: 9, uomId: 'pc', baseQuantity: 9, price: 22.5, position: 2 },
      ]);
    });

    it('converts the quantity of an item in another unit to the base unit', async () => {
      await service.create(
        body({
          customerId: 1,
          typeId: 'T1',
          items: [{ productId: 4, quantity: 2.5, uomId: 'box', position: 1 }],
        }),
        u1,
      );

      expect(insert.values.mock.calls[1][0]).toEqual([
        { orderId: 1, productId: 4, quantity: 2.5, uomId: 'box', baseQuantity: 30, price: 75, position: 1 },
      ]);
      expect(products.units).toHaveBeenCalledWith(4, db);
    });

    it('refuses a unit the product is not sold in', async () => {
      await expect(
        service.create(
          body({
            customerId: 1,
            typeId: 'T1',
            items: [{ productId: 4, quantity: 1, uomId: 'kg', position: 1 }],
          }),
          u1,
        ),
      ).rejects.toMatchObject({ response: { message: ['items.0.uomId: salesOrders.items.uomId.notConvertible'] } });
    });

    it('refuses a product that does not exist', async () => {
      products.units.mockRejectedValue(new NotFoundException());

      await expect(
        service.create(
          body({ customerId: 1, typeId: 'T1', items: [{ productId: 99, quantity: 1, position: 1 }] }),
          u1,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('inserts it in draft and moves it to the status through the state machine', async () => {
      await service.create(body({ customerId: 1, typeId: 'T1', status: 'open' }), u1);

      expect(insert.values.mock.calls[0][0]).not.toHaveProperty('status');
      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'open', { tx: db, user: u1 });
    });
  });

  describe('update', () => {
    const u2 = { id: 'u2' } as SessionUser;
    it('updates the sales order', async () => {
      await service.update(1, body({ customerId: 1, typeId: 'T1' }), u2);

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(salesOrder.id, 1), notDeleted),
      );
    });

    it('keeps the price of an unchanged item, and prices a changed one anew', async () => {
      // The items as saved, priced when the product cost 2.00.
      select.where.mockResolvedValueOnce([
        { position: 1, productId: 4, uomId: 'pc', quantity: 10, price: 20 },
        { position: 2, productId: 3, uomId: 'pc', quantity: 9, price: 18 },
      ]);

      await service.update(
        1,
        body({
          customerId: 1,
          typeId: 'T1',
          items: [
            { productId: 4, quantity: 10, uomId: 'pc', position: 1 },
            { productId: 3, quantity: 1, uomId: 'box', position: 2 },
          ],
        }),
        u2,
      );

      expect(insert.values.mock.calls[0][0]).toEqual([
        { orderId: 1, productId: 4, quantity: 10, uomId: 'pc', baseQuantity: 10, price: 20, position: 1 },
        { orderId: 1, productId: 3, quantity: 1, uomId: 'box', baseQuantity: 12, price: 30, position: 2 },
      ]);
    });

    it('reprices every item when asked, unchanged ones too', async () => {
      await service.update(
        1,
        body({
          customerId: 1,
          typeId: 'T1',
          items: [
            { productId: 4, quantity: 10, uomId: 'pc', position: 1 },
            { productId: 3, quantity: 1, uomId: 'box', position: 2 },
          ],
        }),
        u2,
        { reprice: true },
      );

      // The saved items aren't even read: none keeps its price.
      expect(insert.values.mock.calls[0][0]).toEqual([
        { orderId: 1, productId: 4, quantity: 10, uomId: 'pc', baseQuantity: 10, price: 25, position: 1 },
        { orderId: 1, productId: 3, quantity: 1, uomId: 'box', baseQuantity: 12, price: 30, position: 2 },
      ]);
    });

    it('changes the status through the state machine, after the items', async () => {
      await service.update(1, body({ customerId: 1, typeId: 'T1', status: 'open' }), u2);

      expect(update.set.mock.calls[0][0]).not.toHaveProperty('status');
      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'open', { tx: db, user: u2 });
    });

    it('throws 404 when the sales order is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(999, body({ customerId: 1, typeId: 'T1' }), u2),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.delete(1, actor('u3'));

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(salesOrder.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the sales order is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('changeSalesOrderStatus', () => {
    it('moves the order through its state machine, then returns it', async () => {
      const user = { id: 'u1' } as never;
      stateMachine.transition.mockResolvedValue(undefined);
      await expect(service.changeSalesOrderStatus(1, 'open', user)).resolves.toBe(found);
      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'open', { user });
    });

    it('passes on the state machine errors', async () => {
      stateMachine.transition.mockRejectedValue(new NotFoundException());
      await expect(service.changeSalesOrderStatus(1, 'open', {} as never)).rejects.toThrow(NotFoundException);
      expect(findFirst).not.toHaveBeenCalled();
    });
  });

  describe('nextStatuses', () => {
    it('answers the statuses the state machine allows after the given one', () => {
      stateMachine.nextStatuses.mockReturnValue(['open', 'cancelled']);
      expect(service.nextStatuses('draft')).toEqual(['open', 'cancelled']);
      expect(stateMachine.nextStatuses).toHaveBeenCalledWith('draft');
    });
  });
});

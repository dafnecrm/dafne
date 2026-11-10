import type { SessionUser } from '@dafne/backend-session';
import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { salesOrderBodySchema, type SalesOrderBodyInput } from '@dafne/contracts';
import { getStateMachineToken } from '@dafne/backend-fsm';
import { SalesOrdersService } from './sales-orders.service.js';
import { SALES_ORDER_STATE_MACHINE } from './sales-order.states.js';

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
  const stateMachine = { transition: vi.fn() };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        { provide: getDrizzleToken(), useValue: db },
        { provide: getStateMachineToken(SALES_ORDER_STATE_MACHINE), useValue: stateMachine },
      ],
    }).compile();

    service = module.get(SalesOrdersService);
  });

  describe('listSalesOrders', () => {
    it('lists sales orders that are not deleted, by created at', async () => {
      await expect(service.listSalesOrders()).resolves.toEqual({
        salesOrders: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(salesOrder);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(salesOrder, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        asc(salesOrder.createdAt),
        asc(salesOrder.id),
      );
    });

    it('filters by id, matching it exactly', async () => {
      await service.listSalesOrders({ id: ' 12 ' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, eq(salesOrder.id, 12)),
      );
    });

    it('pages and sorts', async () => {
      await service.listSalesOrders({
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

  describe('getSalesOrder', () => {
    it('returns a sales order that is not deleted, with its users', async () => {
      await expect(service.getSalesOrder(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the sales order does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getSalesOrder(999)).rejects.toBeInstanceOf(
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

  describe('createSalesOrder', () => {
    const u1 = { id: 'u1' } as SessionUser;
    it('inserts the sales order with its creator', async () => {
      await expect(
        service.createSalesOrder(body({ customerId: 1, typeId: 'T1' }), u1),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
      expect(stateMachine.transition).not.toHaveBeenCalled();
    });

    it('inserts it in draft and moves it to the status through the state machine', async () => {
      await service.createSalesOrder(body({ customerId: 1, typeId: 'T1', status: 'open' }), u1);

      expect(insert.values.mock.calls[0][0]).not.toHaveProperty('status');
      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'open', { tx: db, user: u1 });
    });
  });

  describe('updateSalesOrder', () => {
    const u2 = { id: 'u2' } as SessionUser;
    it('updates the sales order', async () => {
      await service.updateSalesOrder(1, body({ customerId: 1, typeId: 'T1' }), u2);

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(salesOrder.id, 1), notDeleted),
      );
    });

    it('changes the status through the state machine, after the items', async () => {
      await service.updateSalesOrder(1, body({ customerId: 1, typeId: 'T1', status: 'open' }), u2);

      expect(update.set.mock.calls[0][0]).not.toHaveProperty('status');
      expect(stateMachine.transition).toHaveBeenCalledWith(1, 'open', { tx: db, user: u2 });
    });

    it('throws 404 when the sales order is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.updateSalesOrder(999, body({ customerId: 1, typeId: 'T1' }), u2),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteSalesOrder', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteSalesOrder(1, 'u3');

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

      await expect(service.deleteSalesOrder(1, 'u3')).rejects.toBeInstanceOf(
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
});

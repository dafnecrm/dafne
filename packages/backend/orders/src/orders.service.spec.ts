import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { orderBodySchema, type OrderBodyInput } from '@dafne/contracts';
import { OrdersService } from './orders.service.js';

/** A body as the validation pipe hands it to the service. */
const body = (input: OrderBodyInput) => orderBodySchema.parse(input);

const { order } = schema;
const notDeleted = isNull(order.deletedAt);

describe('OrdersService', () => {
  let service: OrdersService;
  const rows = [{ id: 1, name: 'Acme' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values().returning() and update().set().where()
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const findFirst = vi.fn();
  const db = {
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: { order: { findFirst } },
  };
  const found = { id: 1, name: 'Acme' };

  beforeEach(async () => {
    vi.resetAllMocks();
    db.select.mockReturnValue(select);
    select.from.mockReturnValue(select);
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
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: getDrizzleToken(), useValue: db }],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('listOrders', () => {
    it('lists orders that are not deleted, by created at', async () => {
      await expect(service.listOrders()).resolves.toEqual({
        orders: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(order);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(order, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        asc(order.createdAt),
        asc(order.id),
      );
    });

    it('filters by id, matching it exactly', async () => {
      await service.listOrders({ id: ' 12 ' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, eq(order.id, 12)),
      );
    });

    it('pages and sorts', async () => {
      await service.listOrders({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(order.createdAt),
        asc(order.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('getOrder', () => {
    it('returns an order that is not deleted, with its users', async () => {
      await expect(service.getOrder(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the order does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getOrder(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createOrder', () => {
    it('inserts the order with its creator', async () => {
      await expect(
        service.createOrder(body({ customerId: 1 }), 'u1'),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
    });
  });

  describe('updateOrder', () => {
    it('updates the order', async () => {
      await service.updateOrder(1, body({ customerId: 1 }), 'u2');

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(order.id, 1), notDeleted),
      );
    });

    it('throws 404 when the order is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.updateOrder(999, body({ customerId: 1 }), 'u2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteOrder', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteOrder(1, 'u3');

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(order.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the order is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.deleteOrder(1, 'u3')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

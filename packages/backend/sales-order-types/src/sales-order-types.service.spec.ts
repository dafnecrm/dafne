import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  salesOrderTypeBodySchema,
  type SalesOrderTypeBodyInput,
} from '@dafne/contracts';
import { SalesOrderTypesService } from './sales-order-types.service.js';

/** A body as the validation pipe hands it to the service. */
const body = (input: SalesOrderTypeBodyInput) =>
  salesOrderTypeBodySchema.parse(input);

const { salesOrderType } = schema;
const notDeleted = isNull(salesOrderType.deletedAt);

describe('SalesOrderTypesService', () => {
  let service: SalesOrderTypesService;
  const rows = [{ id: 'id-1' }];
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
    query: { salesOrderType: { findFirst } },
  };
  const found = { id: 'id-1' };

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
    insert.returning.mockResolvedValue([{ id: 'id-1' }]);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue({ rowCount: 1 });
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrderTypesService,
        { provide: getDrizzleToken(), useValue: db },
      ],
    }).compile();

    service = module.get(SalesOrderTypesService);
  });

  describe('listSalesOrderTypes', () => {
    it('lists sales order types that are not deleted, oldest first', async () => {
      await expect(service.listSalesOrderTypes()).resolves.toEqual({
        salesOrderTypes: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(salesOrderType);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(salesOrderType, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        asc(salesOrderType.createdAt),
        asc(salesOrderType.id),
      );
    });

    it('pages and sorts', async () => {
      await service.listSalesOrderTypes({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(salesOrderType.createdAt),
        asc(salesOrderType.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('getSalesOrderType', () => {
    it('returns a sales order type that is not deleted, with its users', async () => {
      await expect(service.getSalesOrderType('id-1')).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({
        id: 'id-1',
        deletedAt: { isNull: true },
      });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the sales order type does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getSalesOrderType('id-999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createSalesOrderType', () => {
    it('inserts the sales order type with its creator', async () => {
      await expect(service.createSalesOrderType(body({}), 'u1')).resolves.toBe(
        found,
      );

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      // The id the database gave it.
      expect(findFirst.mock.calls[0][0].where.id).toBe('id-1');
    });
  });

  describe('updateSalesOrderType', () => {
    it('updates the sales order type', async () => {
      await service.updateSalesOrderType('id-1', body({}), 'u2');

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(salesOrderType.id, 'id-1'), notDeleted),
      );
    });

    it('throws 404 when the sales order type is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.updateSalesOrderType('id-999', body({}), 'u2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteSalesOrderType', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteSalesOrderType('id-1', 'u3');

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(salesOrderType.id, 'id-1'), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the sales order type is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.deleteSalesOrderType('id-1', 'u3'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import {
  salesOrderTypeBodySchema,
  type SalesOrderTypeBodyInput,
} from '@dafne/contracts';
import { SalesOrderTypesService } from './sales-order-types.service.js';
import type { Actor } from '@dafne/backend-crud';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

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

  describe('list', () => {
    it('lists sales order types that are not deleted, by id', async () => {
      await expect(service.list()).resolves.toEqual({
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
        asc(salesOrderType.id),
        asc(salesOrderType.id),
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
        desc(salesOrderType.createdAt),
        asc(salesOrderType.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });

    it('searches the id or the description, with the other filters', async () => {
      await service.list({ active: 'true', search: ' 5%_ ' });

      const where = select.where.mock.calls[0][0];
      const pattern = '%5\\%\\_%';
      expect(where).toEqual(
        and(
          notDeleted,
          eq(salesOrderType.active, true),
          or(
            ilike(salesOrderType.id, pattern),
            ilike(salesOrderType.description, pattern),
          ),
        ),
      );
    });
  });

  describe('get', () => {
    it('returns a sales order type that is not deleted, with its users', async () => {
      await expect(service.get('id-1')).resolves.toBe(found);

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

      await expect(service.get('id-999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('inserts the sales order type with its creator', async () => {
      await expect(
        service.create(
          body({ description: 'Description', id: 'Id' }),
          actor('u1'),
        ),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        id: 'Id',
        createdById: 'u1',
        updatedById: 'u1',
      });
      // Read back by the id the insert returned.
      expect(findFirst.mock.calls[0][0].where.id).toBe('id-1');
    });

    it('throws 409 when the id is taken', async () => {
      const cause = Object.assign(new Error('duplicate key'), {
        code: '23505',
        constraint: 'sales_order_type_pkey',
      });
      insert.returning.mockRejectedValue(new Error('insert failed', { cause }));
      await expect(
        service.create(
          body({ description: 'Description', id: 'Id' }),
          actor('u1'),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('updates the sales order type', async () => {
      await service.update(
        'id-1',
        body({ description: 'Description', id: 'Id' }),
        actor('u2'),
      );

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
        service.update(
          'id-999',
          body({ description: 'Description', id: 'Id' }),
          actor('u2'),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.delete('id-1', actor('u3'));

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
        service.delete('id-1', actor('u3')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

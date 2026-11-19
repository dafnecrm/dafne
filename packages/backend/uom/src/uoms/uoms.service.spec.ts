import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { uomBodySchema, type UomBodyInput } from '@dafne/contracts';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { UomsService } from './uoms.service.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: UomBodyInput) => uomBodySchema.parse(input);

const { uom } = schema;
const notDeleted = isNull(uom.deletedAt);

describe('UomsService', () => {
  let service: UomsService;
  const rows = [{ id: 'id-1' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values().returning() and update().set().where()
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const remove = { where: vi.fn() };
  const findFirst = vi.fn();
  const db = {
    transaction: vi.fn(),
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: { uom: { findFirst } },
  };
  const found = { id: 'id-1', conversions: [], conversionsTo: [] };
  const detail = { id: 'id-1', conversions: [], conversionsFrom: [] };

  beforeEach(async () => {
    vi.resetAllMocks();
    // The transaction runs on the same mock db.
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) =>
      run(db),
    );
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
    insert.returning.mockResolvedValue([{ id: 'id-1' }]);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue({ rowCount: 1 });
    findFirst.mockResolvedValue(found);
    db.delete.mockReturnValue(remove);
    remove.where.mockResolvedValue({ rowCount: 0 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UomsService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
      ],
    }).compile();

    service = module.get(UomsService);
  });

  describe('list', () => {
    it('lists uoms that are not deleted, by symbol', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(uom);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(uom, where);
      expect(select.orderBy).toHaveBeenCalledWith(asc(uom.id), asc(uom.id));
    });

    it('pages and sorts', async () => {
      await service.list({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(uom.createdAt),
        asc(uom.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns an uom that is not deleted, with its users', async () => {
      await expect(service.get('id-1')).resolves.toEqual(detail);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({
        id: 'id-1',
        deletedAt: { isNull: true },
      });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('returns its conversions to and from units that are not deleted', async () => {
      findFirst.mockResolvedValue({
        id: 'g',
        conversions: [{ id: 1, toUomId: 'kg', factor: 1000, toUom: { id: 'kg', name: 'kilogram' } }],
        conversionsTo: [{ id: 2, fromUomId: 'mg', factor: 1000, fromUom: { id: 'mg', name: 'milligram' } }],
      });

      await expect(service.get('g')).resolves.toEqual({
        id: 'g',
        conversions: [{ id: 1, toUomId: 'kg', factor: 1000, to: { id: 'kg', name: 'kilogram' } }],
        conversionsFrom: [{ id: 2, fromUomId: 'mg', factor: 1000, from: { id: 'mg', name: 'milligram' } }],
      });
      const { with: relations } = findFirst.mock.calls[0][0];
      expect(relations.conversions.where).toEqual({ deletedAt: { isNull: true }, toUom: { deletedAt: { isNull: true } } });
    });

    it('throws 404 when the uom does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get('id-999')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('inserts the uom with its creator', async () => {
      await expect(
        service.create(
          body({ id: 'Id', name: 'Name', kind: 'weight' }),
          actor('u1'),
        ),
      ).resolves.toEqual(detail);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      // The id the database gave it.
      expect(findFirst.mock.calls[0][0].where.id).toBe('id-1');
    });
  });

  describe('update', () => {
    it('updates the uom', async () => {
      select.limit.mockResolvedValueOnce([]);
      await service.update(
        'id-1',
        body({ id: 'Id', name: 'Name', kind: 'weight' }),
        actor('u2'),
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(uom.id, 'id-1'), notDeleted),
      );
    });

    it('refuses a kind other than the units it converts with', async () => {
      select.limit.mockResolvedValueOnce([{ id: 'mg' }]);

      await expect(
        service.update('g', body({ id: 'g', name: 'gram', kind: 'volume' }), actor('u2')),
      ).rejects.toMatchObject({ response: { message: ['kind: uomConversions.otherKind'] } });
    });

    it('throws 404 when the uom is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(
          'id-999',
          body({ id: 'Id', name: 'Name', kind: 'weight' }),
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
        and(eq(uom.id, 'id-1'), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the uom is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete('id-1', actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

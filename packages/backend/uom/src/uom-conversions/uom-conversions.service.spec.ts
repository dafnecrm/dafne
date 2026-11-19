import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, eq, isNull } from 'drizzle-orm';
import { uomConversionBodySchema, type UomConversionBodyInput } from '@dafne/contracts';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { UomConversionsService } from './uom-conversions.service.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: UomConversionBodyInput) => uomConversionBodySchema.parse(input);

const { uomConversion } = schema;
const notDeleted = isNull(uomConversion.deletedAt);

describe('UomConversionsService', () => {
  let service: UomConversionsService;
  // Chainable stand-in for db.select().from().innerJoin().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const findFirst = vi.fn();
  const db = {
    transaction: vi.fn(),
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    query: { uomConversion: { findFirst } },
  };
  const found = {
    id: 1,
    fromUomId: 'g',
    toUomId: 'kg',
    factor: 1000,
    fromUom: { id: 'g', name: 'gram' },
    toUom: { id: 'kg', name: 'kilogram' },
  };
  const detail = {
    id: 1,
    fromUomId: 'g',
    toUomId: 'kg',
    factor: 1000,
    from: { id: 'g', name: 'gram' },
    to: { id: 'kg', name: 'kilogram' },
  };
  const weights = [
    { id: 'g', kind: 'weight' },
    { id: 'kg', kind: 'weight' },
  ];

  beforeEach(async () => {
    vi.resetAllMocks();
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) => run(db));
    db.select.mockReturnValue(select);
    select.from.mockReturnValue(select);
    select.innerJoin.mockReturnValue(select);
    select.where.mockReturnValue(select);
    select.orderBy.mockReturnValue(select);
    select.limit.mockReturnValue(select);
    select.offset.mockResolvedValue([detail]);
    db.$count.mockResolvedValue(1);
    db.insert.mockReturnValue(insert);
    insert.values.mockReturnValue(insert);
    insert.returning.mockResolvedValue([{ id: 1 }]);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue({ rowCount: 1 });
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UomConversionsService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
      ],
    }).compile();

    service = module.get(UomConversionsService);
  });

  describe('list', () => {
    it('lists the conversions that are not deleted, with their units', async () => {
      await expect(service.list()).resolves.toEqual({ items: [detail], total: 1, limit: 20, offset: 0 });
      expect(select.where).toHaveBeenCalledWith(and(notDeleted));
    });
  });

  describe('get', () => {
    it('returns a conversion with its units', async () => {
      await expect(service.get(1)).resolves.toEqual(detail);
      expect(findFirst.mock.calls[0][0].where).toEqual({ id: 1, deletedAt: { isNull: true } });
    });

    it('throws 404 when it does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);
      await expect(service.get(9)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('factorsFrom', () => {
    it('reads the conversions of the unit both ways', async () => {
      select.where.mockResolvedValueOnce([
        { fromUomId: 'g', toUomId: 'kg', factor: 1000 },
        { fromUomId: 'mg', toUomId: 'g', factor: 1000 },
      ]);

      await expect(service.factorsFrom('g')).resolves.toEqual(
        new Map([
          ['kg', 1000],
          ['mg', 0.001],
        ]),
      );
    });
  });

  describe('create', () => {
    it('inserts a conversion between units of the same kind', async () => {
      select.where.mockResolvedValueOnce(weights);

      await expect(
        service.create(body({ fromUomId: 'g', toUomId: 'kg', factor: 1000 }), actor('u1')),
      ).resolves.toEqual(detail);
      expect(insert.values.mock.calls[0][0]).toMatchObject({
        fromUomId: 'g',
        toUomId: 'kg',
        factor: 1000,
        createdById: 'u1',
      });
    });

    it('refuses a unit that does not exist', async () => {
      select.where.mockResolvedValueOnce([weights[0]]);

      await expect(
        service.create(body({ fromUomId: 'g', toUomId: 'kg', factor: 1000 }), actor('u1')),
      ).rejects.toMatchObject({ response: { message: ['toUomId: uomConversions.uomNotFound'] } });
    });

    it('refuses units of different kinds', async () => {
      select.where.mockResolvedValueOnce([weights[0], { id: 'l', kind: 'volume' }]);

      await expect(
        service.create(body({ fromUomId: 'g', toUomId: 'l', factor: 1000 }), actor('u1')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('turns a pair that has a conversion into a 409', async () => {
      select.where.mockResolvedValueOnce(weights);
      insert.returning.mockRejectedValue(
        Object.assign(new Error('duplicate'), { code: '23505', constraint: 'uom_conversion_pair_idx' }),
      );

      await expect(
        service.create(body({ fromUomId: 'kg', toUomId: 'g', factor: 0.001 }), actor('u1')),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('update', () => {
    it('updates the conversion', async () => {
      select.where.mockResolvedValueOnce(weights);

      await service.update(1, body({ fromUomId: 'g', toUomId: 'kg', factor: 1000 }), actor('u2'));
      expect(update.where).toHaveBeenCalledWith(and(eq(uomConversion.id, 1), notDeleted));
    });

    it('throws 404 when it is missing', async () => {
      select.where.mockResolvedValueOnce(weights);
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(9, body({ fromUomId: 'g', toUomId: 'kg', factor: 1000 }), actor('u2')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('sets deletedAt', async () => {
      await service.delete(1, actor('u3'));
      expect(update.set.mock.calls[0][0].deletedAt).toBeInstanceOf(Date);
    });
  });
});

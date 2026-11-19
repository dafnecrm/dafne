import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, ilike } from 'drizzle-orm';
import { productBodySchema, type ProductBodyInput } from '@dafne/contracts';
import { UomConversionsService } from '@dafne/backend-uom';
import { ProductsService } from './products.service.js';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { ProductNotUsedHook } from './product-not-used.crud-hook.ts';
import { PRODUCTS_RESOURCE } from './product.changelog.ts';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: ProductBodyInput) => productBodySchema.parse(input);

const { product, productUom } = schema;
const notDeleted = isNull(product.deletedAt);

describe('ProductsService', () => {
  let service: ProductsService;
  let registry: CrudHooksRegistry;

  const rows = [{ id: 1, name: 'Acme' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };

  const salesOrderItemFindFirst = vi.fn()

  // Stand-ins for insert().values().returning() and update().set().where()
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const remove = { where: vi.fn() };
  const findFirst = vi.fn();
  const conversions = { factorsFrom: vi.fn() };
  const db = {
    transaction: vi.fn(),
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: {
      product: { findFirst },
      salesOrderItem: { findFirst: salesOrderItemFindFirst },
    },
  };
  const found = { id: 1, name: 'Acme', uomId: 'pc', units: [] };

  beforeEach(async () => {
    vi.resetAllMocks();
    // The transaction runs on the same mock db.
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) => run(db));
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
    db.delete.mockReturnValue(remove);
    remove.where.mockResolvedValue({ rowCount: 0 });
    conversions.factorsFrom.mockResolvedValue(new Map());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
        { provide: UomConversionsService, useValue: conversions },
      ],
    }).compile();

    service = module.get(ProductsService);
    registry = module.get(CrudHooksRegistry)
  });

  describe('list', () => {
    it('lists products that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(product);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(product, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(product.id),
        asc(product.id),
      );
    });

    it('filters with contains, escaping LIKE wildcards', async () => {
      await service.list({ name: '50%_a' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, ilike(product.name, '%50\\%\\_a%')),
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
        desc(product.createdAt),
        asc(product.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns a product that is not deleted, with its users', async () => {
      await expect(service.get(1)).resolves.toEqual(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the product does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('inserts the product with its creator', async () => {
      await expect(
        service.create(body({ name: 'Acme', price: '1.00', uomId: 'pc' }), actor('u1')),
      ).resolves.toEqual(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        name: 'Acme',
        uomId: 'pc',
        createdById: 'u1',
        updatedById: 'u1',
      });
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
    });

    it('replaces the units of the product, which its base unit converts to', async () => {
      conversions.factorsFrom.mockResolvedValue(new Map([['box', 12]]));

      await service.create(
        body({ name: 'Acme', price: '1.00', uomId: 'pc', units: [{ uomId: 'box' }] }),
        actor('u1'),
      );

      expect(conversions.factorsFrom).toHaveBeenCalledWith('pc', db);
      expect(remove.where).toHaveBeenCalledWith(eq(productUom.productId, 1));
      expect(insert.values.mock.calls[1][0]).toEqual([{ productId: 1, uomId: 'box' }]);
    });

    it('refuses a unit without a conversion with the base unit', async () => {
      conversions.factorsFrom.mockResolvedValue(new Map([['dz', 12]]));

      await expect(
        service.create(
          body({ name: 'Acme', price: '1.00', uomId: 'pc', units: [{ uomId: 'kg' }] }),
          actor('u1'),
        ),
      ).rejects.toMatchObject({ response: { message: ['units.0.uomId: products.units.uomId.notConvertible'] } });
    });
  });

  describe('units', () => {
    it('lists the base unit, then the product units that still convert', async () => {
      findFirst.mockResolvedValue({
        uomId: 'pc',
        price: '2.50',
        uom: { id: 'pc', name: 'piece' },
        units: [
          { uomId: 'box', uom: { id: 'box', name: 'box' } },
          { uomId: 'pack', uom: { id: 'pack', name: 'pack' } },
        ],
      });
      // pack's conversion was deleted.
      conversions.factorsFrom.mockResolvedValue(new Map([['box', 12], ['dz', 12]]));

      await expect(service.units(1)).resolves.toEqual([
        { uomId: 'pc', uom: { id: 'pc', name: 'piece' }, factor: 1, source: 'base', price: '2.500000' },
        { uomId: 'box', uom: { id: 'box', name: 'box' }, factor: 12, source: 'product', price: '30.000000' },
      ]);
      expect(conversions.factorsFrom).toHaveBeenCalledWith('pc', db);
    });

    it('throws 404 when the product does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.units(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates the product', async () => {
      await service.update(
        1,
        body({ name: 'Acme Inc', price: '1.00', uomId: 'kg' }),
        actor('u2'),
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        name: 'Acme Inc',
        uomId: 'kg',
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(product.id, 1), notDeleted),
      );
    });

    it('throws 404 when the product is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(999, body({ name: 'X', price: '1.00', uomId: 'pc' }), actor('u2')),
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
        and(eq(product.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the product is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should not delete a product used in a sales order item', async () => {
      const hook = new ProductNotUsedHook()
      registry.register(
        PRODUCTS_RESOURCE,
        { delete: { pre: [ProductNotUsedHook] } },
        new Map([[ProductNotUsedHook, hook]])
      );

      salesOrderItemFindFirst.mockResolvedValue({ productId: 1 });

      await expect(service.delete(1, actor('u3'))).rejects.toEqual(new ForbiddenException('products.used'));

      expect(salesOrderItemFindFirst).toHaveBeenCalledWith({
        columns: { productId: true },
        where: { productId: 1 },
      });

      expect(update.set).not.toHaveBeenCalled(); // deletedAt never set
    });
    
    it('should delete a product not used in a sales order item', async () => {
      const hook = new ProductNotUsedHook()
      registry.register(
        PRODUCTS_RESOURCE,
        { delete: { pre: [ProductNotUsedHook] } },
        new Map([[ProductNotUsedHook, hook]])
      );

      salesOrderItemFindFirst.mockResolvedValue(null);

      await service.delete(2, actor('u3'));

      expect(salesOrderItemFindFirst).toHaveBeenCalledWith({
        columns: { productId: true },
        where: { productId: 2 },
      });

      expect(update.set).toHaveBeenCalled(); // deletedAt set
    });
  });
});

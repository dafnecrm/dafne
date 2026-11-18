import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  assistantProviderBodySchema,
  type AssistantProviderBodyInput,
} from '@dafne/contracts';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { AssistantProvidersService } from './assistant-providers.service.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: AssistantProviderBodyInput) =>
  assistantProviderBodySchema.parse(input);

const { assistantProvider } = schema;
const notDeleted = isNull(assistantProvider.deletedAt);

describe('AssistantProvidersService', () => {
  let service: AssistantProvidersService;
  const rows = [{ id: 1 }];
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
    transaction: vi.fn(),
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: { assistantProvider: { findFirst } },
  };
  const found = { id: 1 };

  beforeEach(async () => {
    vi.resetAllMocks();
    // The transaction runs on the same mock db.
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) =>
      run(db),
    );
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
      providers: [
        AssistantProvidersService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
      ],
    }).compile();

    service = module.get(AssistantProvidersService);
  });

  describe('list', () => {
    it('lists assistant providers that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(assistantProvider);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(assistantProvider, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(assistantProvider.id),
        asc(assistantProvider.id),
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
        desc(assistantProvider.createdAt),
        asc(assistantProvider.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns an assistant provider that is not deleted, with its users', async () => {
      await expect(service.get(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the assistant provider does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('inserts the assistant provider with its creator', async () => {
      await expect(
        service.create(body({ name: 'Name', kind: 'anthropic' }), actor('u1')),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      // The id the database gave it.
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
    });
  });

  describe('update', () => {
    it('updates the assistant provider', async () => {
      await service.update(
        1,
        body({ name: 'Name', kind: 'anthropic' }),
        actor('u2'),
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(assistantProvider.id, 1), notDeleted),
      );
    });

    it('throws 404 when the assistant provider is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(
          999,
          body({ name: 'Name', kind: 'anthropic' }),
          actor('u2'),
        ),
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
        and(eq(assistantProvider.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the assistant provider is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

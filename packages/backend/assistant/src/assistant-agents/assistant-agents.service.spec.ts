import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  assistantAgentBodySchema,
  type AssistantAgentBodyInput,
} from '@dafne/contracts';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { AssistantAgentsService } from './assistant-agents.service.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: AssistantAgentBodyInput) =>
  assistantAgentBodySchema.parse(input);

const { assistantAgent } = schema;
const notDeleted = isNull(assistantAgent.deletedAt);

describe('AssistantAgentsService', () => {
  let service: AssistantAgentsService;
  const rows = [{ id: 1 }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    // Awaiting the chain itself (the groups' query) gives no groups.
    then: (resolve: (value: unknown) => unknown) => resolve([]),
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
    query: { assistantAgent: { findFirst } },
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
    select.innerJoin.mockReturnValue(select);
    db.delete.mockReturnValue(remove);
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
        AssistantAgentsService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
      ],
    }).compile();

    service = module.get(AssistantAgentsService);
  });

  describe('list', () => {
    it('lists assistant agents that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows.map((row) => ({ ...row, groups: [] })),
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(assistantAgent);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(assistantAgent, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(assistantAgent.id),
        asc(assistantAgent.id),
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
        desc(assistantAgent.createdAt),
        asc(assistantAgent.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns an assistant agent that is not deleted, with its users', async () => {
      await expect(service.get(1)).resolves.toEqual({ ...found, groups: [] });

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the assistant agent does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('groups', () => {
    it('saves the groups of an agent open to groups only', async () => {
      insert.values.mockClear();
      await service.create(
        body({ name: 'Scrittura', systemPrompt: 'S', audience: 'groups', groupIds: [4, 5] }),
        actor('u1'),
      );

      expect(insert.values.mock.calls[0][0]).toMatchObject({ audience: 'groups' });
      expect(insert.values.mock.calls[1][0]).toEqual([
        { agentId: 1, groupId: 4 },
        { agentId: 1, groupId: 5 },
      ]);
    });

    it('drops the groups when it is open to everyone again', async () => {
      await service.update(1, body({ name: 'Scrittura', systemPrompt: 'S', audience: 'everyone', groupIds: [4] }), actor('u1'));

      expect(update.set.mock.calls[0][0]).toMatchObject({ audience: 'everyone' });
      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('inserts the assistant agent with its creator', async () => {
      await expect(
        service.create(
          body({ name: 'Name', systemPrompt: 'System prompt' }),
          actor('u1'),
        ),
      ).resolves.toEqual({ ...found, groups: [] });

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
    it('updates the assistant agent', async () => {
      await service.update(
        1,
        body({ name: 'Name', systemPrompt: 'System prompt' }),
        actor('u2'),
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(assistantAgent.id, 1), notDeleted),
      );
    });

    it('throws 404 when the assistant agent is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(
          999,
          body({ name: 'Name', systemPrompt: 'System prompt' }),
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
        and(eq(assistantAgent.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the assistant agent is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

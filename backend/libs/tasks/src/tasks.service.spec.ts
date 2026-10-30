import { DatabaseService, schema } from '@app/database';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, like } from 'drizzle-orm';
import { taskBodySchema, type TaskBodyInput } from '@app/contracts';
import { TasksService } from './tasks.service.js';

/** A body as the validation pipe hands it to the service. */
const body = (input: TaskBodyInput) => taskBodySchema.parse(input);

const { task } = schema;
const notDeleted = isNull(task.deletedAt);

describe('TasksService', () => {
  let service: TasksService;
  const rows = [{ id: 'r1', name: 'Acme' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values() and update().set().where()
  const insert = { values: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const findFirst = vi.fn();
  const db = {
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: { task: { findFirst } },
  };
  const found = { id: 'r1', name: 'Acme' };

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
    insert.values.mockResolvedValue(undefined);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue([{ affectedRows: 1 }]);
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, { provide: DatabaseService, useValue: { db } }],
    }).compile();

    service = module.get(TasksService);
  });

  describe('listTasks', () => {
    it('lists tasks that are not deleted, by name', async () => {
      await expect(service.listTasks()).resolves.toEqual({
        tasks: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(task);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(task, where);
      expect(select.orderBy).toHaveBeenCalledWith(asc(task.name), asc(task.id));
    });

    it('filters with contains, escaping LIKE wildcards', async () => {
      await service.listTasks({ name: '50%_a' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, like(task.name, '%50\\%\\_a%')),
      );
    });

    it("filters by an activity's id exactly", async () => {
      await service.listTasks({ activityId: 'a1' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, eq(task.activityId, 'a1')),
      );
    });

    it('pages and sorts', async () => {
      await service.listTasks({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(task.createdAt),
        asc(task.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('getTask', () => {
    it('returns a task that is not deleted, with its users', async () => {
      await expect(service.getTask('r1')).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 'r1', deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the task does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getTask('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createTask', () => {
    it('inserts the task with its creator', async () => {
      await expect(
        service.createTask(
          body({
            name: 'Acme',
            dueDate: '2026-01-01T10:00:00.000Z',
            notes: 'Notes',
            type: 'email',
            activityId: 'Activity id',
          }),
          'u1',
        ),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        name: 'Acme',
        createdById: 'u1',
        updatedById: 'u1',
      });
      expect(findFirst.mock.calls[0][0].where.id).toBe(row.id);
    });
  });

  describe('updateTask', () => {
    it('updates the task', async () => {
      await service.updateTask(
        'r1',
        body({
          name: 'Acme Inc',
          dueDate: '2026-01-01T10:00:00.000Z',
          notes: 'Notes',
          type: 'email',
          activityId: 'Activity id',
        }),
        'u2',
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        name: 'Acme Inc',
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(task.id, 'r1'), notDeleted),
      );
    });

    it('throws 404 when the task is missing', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(
        service.updateTask(
          'nope',
          body({
            name: 'X',
            dueDate: '2026-01-01T10:00:00.000Z',
            notes: 'Notes',
            type: 'email',
            activityId: 'Activity id',
          }),
          'u2',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteTask', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteTask('r1', 'u3');

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(task.id, 'r1'), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the task is missing or already deleted', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(service.deleteTask('r1', 'u3')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

import { DatabaseService, schema } from '@app/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, inArray, isNull, like, ne } from 'drizzle-orm';
import { activityBodySchema, type ActivityBodyInput } from '@app/contracts';
import { ActivitiesService } from './activities.service.js';

/** A body as the validation pipe hands it to the service. */
const body = (input: ActivityBodyInput) => activityBodySchema.parse(input);

const { activity, task } = schema;
const notDeleted = isNull(activity.deletedAt);
// Closed activities can't be edited.
const notClosed = ne(activity.status, 'closed');

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  const rows = [{ id: 'r1', name: 'Acme' }];
  // The activity's tasks, as saveTasks reads them (select().from().where()).
  let existingTasks: object[] = [];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset();
  // awaited after where() it gives the existing tasks.
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    then: (resolve: (rows: object[]) => unknown) => resolve(existingTasks),
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
    transaction: vi.fn(),
    query: { activity: { findFirst } },
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
    // The transaction runs on the same mock db.
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) =>
      run(db),
    );
    existingTasks = [];
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: DatabaseService, useValue: { db } },
      ],
    }).compile();

    service = module.get(ActivitiesService);
  });

  describe('listActivities', () => {
    it('lists activities that are not deleted, by name', async () => {
      await expect(service.listActivities()).resolves.toEqual({
        activities: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(activity);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(activity, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        asc(activity.name),
        asc(activity.id),
      );
    });

    it('filters with contains, escaping LIKE wildcards', async () => {
      await service.listActivities({ name: '50%_a' });

      expect(select.where).toHaveBeenCalledWith(
        and(notDeleted, like(activity.name, '%50\\%\\_a%')),
      );
    });

    it('pages and sorts', async () => {
      await service.listActivities({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(activity.createdAt),
        asc(activity.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('getActivity', () => {
    it('returns a activity that is not deleted, with its users', async () => {
      await expect(service.getActivity('r1')).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 'r1', deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the activity does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getActivity('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('createActivity', () => {
    it('inserts the activity with its creator', async () => {
      await expect(
        service.createActivity(body({ name: 'Acme', type: 'email' }), 'u1'),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        name: 'Acme',
        createdById: 'u1',
        updatedById: 'u1',
      });
      expect(findFirst.mock.calls[0][0].where.id).toBe(row.id);
    });

    it('creates its tasks', async () => {
      await service.createActivity(
        body({
          name: 'Acme',
          type: 'email',
          tasks: [
            {
              name: 'Call back',
              dueDate: '2026-01-01T10:00:00.000Z',
              type: 'phone',
              notes: 'Ask for the budget',
            },
          ],
        }),
        'u1',
      );

      const [activityRow] = insert.values.mock.calls[0];
      const [taskRows] = insert.values.mock.calls[1];
      expect(taskRows).toMatchObject([
        {
          activityId: activityRow.id,
          name: 'Call back',
          dueDate: new Date('2026-01-01T10:00:00.000Z'),
          createdById: 'u1',
        },
      ]);
    });

    it('rejects a task id, since a new activity has none', async () => {
      await expect(
        service.createActivity(
          body({
            name: 'Acme',
            type: 'email',
            tasks: [
              {
                id: 't9',
                name: 'Stolen',
                dueDate: '2026-01-01T10:00:00.000Z',
                type: 'phone',
                notes: 'x',
              },
            ],
          }),
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateActivity', () => {
    it('updates the activity', async () => {
      await service.updateActivity(
        'r1',
        body({ name: 'Acme Inc', type: 'email' }),
        'u2',
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        name: 'Acme Inc',
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(activity.id, 'r1'), notDeleted, notClosed),
      );
    });

    it('updates changed tasks, creates new ones and deletes the others', async () => {
      const due = new Date('2026-01-01T10:00:00.000Z');
      existingTasks = [
        { id: 't1', name: 'Old', dueDate: due, type: 'email', notes: 'n' },
        { id: 't2', name: 'Kept', dueDate: due, type: 'email', notes: 'n' },
        { id: 't3', name: 'Gone', dueDate: due, type: 'email', notes: 'n' },
      ];
      const item = {
        dueDate: due.toISOString(),
        type: 'email' as const,
        notes: 'n',
      };

      await service.updateActivity(
        'r1',
        body({
          name: 'Acme',
          type: 'email',
          tasks: [
            { ...item, id: 't1', name: 'New' },
            { ...item, id: 't2', name: 'Kept' },
            { ...item, name: 'Fresh' },
          ],
        }),
        'u2',
      );

      // t3 left out: deleted logically.
      expect(update.where).toHaveBeenCalledWith(inArray(task.id, ['t3']));
      // t1 changed: updated; t2 didn't: left alone.
      expect(update.where).toHaveBeenCalledWith(eq(task.id, 't1'));
      expect(update.where).not.toHaveBeenCalledWith(eq(task.id, 't2'));
      expect(update.set).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'New', updatedById: 'u2' }),
      );
      const [created] = insert.values.mock.calls[0];
      expect(created).toMatchObject([
        { activityId: 'r1', name: 'Fresh', createdById: 'u2' },
      ]);
    });

    it('throws 404 when the activity is missing', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(
        service.updateActivity(
          'nope',
          body({ name: 'X', type: 'email' }),
          'u2',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteActivity', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteActivity('r1', 'u3');

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(activity.id, 'r1'), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the activity is missing or already deleted', async () => {
      update.where.mockResolvedValue([{ affectedRows: 0 }]);

      await expect(service.deleteActivity('r1', 'u3')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, ilike, ne } from 'drizzle-orm';
import { activityBodySchema, type ActivityBodyInput } from '@dafne/contracts';
import { ActivitiesService } from './activities.service.js';

/** A body as the validation pipe hands it to the service. */
const body = (input: ActivityBodyInput) => activityBodySchema.parse(input);

const { activity } = schema;
const notDeleted = isNull(activity.deletedAt);
// Closed activities can't be edited.
const notClosed = ne(activity.status, 'closed');

describe('ActivitiesService', () => {
  let service: ActivitiesService;
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
    query: { activity: { findFirst } },
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
      providers: [
        ActivitiesService,
        { provide: getDrizzleToken(), useValue: db },
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
        and(notDeleted, ilike(activity.name, '%50\\%\\_a%')),
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
      await expect(service.getActivity(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the activity does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getActivity(999)).rejects.toBeInstanceOf(
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
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
    });
  });

  describe('updateActivity', () => {
    it('updates the activity', async () => {
      await service.updateActivity(
        1,
        body({ name: 'Acme Inc', type: 'email' }),
        'u2',
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        name: 'Acme Inc',
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(activity.id, 1), notDeleted, notClosed),
      );
    });

    it('throws 404 when the activity is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.updateActivity(999, body({ name: 'X', type: 'email' }), 'u2'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteActivity', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.deleteActivity(1, 'u3');

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(activity.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the activity is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.deleteActivity(1, 'u3')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

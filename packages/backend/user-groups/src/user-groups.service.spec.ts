import { authSchema as schema } from '@dafne/backend-database-auth';
import { getDrizzleToken } from '@nestjs/drizzle';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { userGroupBodySchema, type UserGroupBodyInput } from '@dafne/contracts';
import { PermissionsVersion } from './permissions-version.js';
import { UserGroupsService } from './user-groups.service.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id });

/** The SQL of a condition, to compare two of them. */
const toSql = (condition: SQL | undefined) => new PgDialect().sqlToQuery(condition!);

/** A body as the validation pipe hands it to the service. */
const body = (input: UserGroupBodyInput) => userGroupBodySchema.parse(input);

const { userGroup } = schema;
const notDeleted = isNull(userGroup.deletedAt);

describe('UserGroupsService', () => {
  let service: UserGroupsService;
  const rows = [{ id: 1 }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const members = [{ id: 'u9', name: 'Ada', email: 'ada@example.com' }];
  const select = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    // Awaiting the chain itself (the members' query) gives the members.
    then: (resolve: (value: unknown) => unknown) => resolve(members),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values().returning() and
  // update().set().where()[.returning()]: awaiting where() gives the
  // result (delete), returning() the updated rows (update).
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn(), returning: vi.fn() };
  let updated: { allUsers: boolean }[] = [];
  let rowCount = 1;
  const remove = { where: vi.fn() };
  const findFirst = vi.fn();
  const permissionsVersion = { bump: vi.fn() };
  const db = {
    transaction: vi.fn(),
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: { userGroup: { findFirst } },
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
    updated = [{ allUsers: false }];
    rowCount = 1;
    update.where.mockReturnValue({
      returning: update.returning,
      then: (resolve: (value: unknown) => unknown) => resolve({ rowCount }),
    });
    update.returning.mockImplementation(async () => updated);
    findFirst.mockResolvedValue(found);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGroupsService,
        { provide: getDrizzleToken(), useValue: db },
        { provide: PermissionsVersion, useValue: permissionsVersion },
      ],
    }).compile();

    service = module.get(UserGroupsService);
  });

  describe('list', () => {
    it('lists user groups that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(userGroup);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(userGroup, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(userGroup.id),
        asc(userGroup.id),
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
        desc(userGroup.createdAt),
        asc(userGroup.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });

    it("lists a user's groups, with memberId", async () => {
      await service.list({ memberId: 'u7' });

      const { sql, params } = toSql(select.where.mock.calls[0][0]);
      expect(sql).toContain('exists (select 1 from "auth"."user_group_member"');
      expect(params).toContain('u7');
    });
  });

  describe('ofMember', () => {
    it("gives the user's groups that are not deleted, by name", async () => {
      await expect(service.ofMember('u7')).resolves.toBe(members);

      expect(select.from).toHaveBeenCalledWith(userGroup);
      const { sql, params } = toSql(select.where.mock.calls[0][0]);
      expect(sql).toContain('"auth"."user_group"."deleted_at" is null');
      expect(sql).toContain('exists (select 1 from "auth"."user_group_member"');
      expect(params).toContain('u7');
      expect(select.orderBy).toHaveBeenCalledWith(asc(userGroup.name));
    });
  });

  describe('get', () => {
    it('returns an user group that is not deleted, with its users', async () => {
      await expect(service.get(1)).resolves.toMatchObject({ ...found, members, memberCount: 1 });

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the user group does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('members', () => {
    it('saves the members of a new group', async () => {
      insert.values.mockClear();
      await service.create(body({ name: 'Commerciali', memberIds: ['u1', 'u2'] }), actor('u1'));

      expect(insert.values.mock.calls[1][0]).toEqual([
        { groupId: 1, userId: 'u1' },
        { groupId: 1, userId: 'u2' },
      ]);
    });

    it('replaces the members on update, and can empty the group', async () => {
      await service.update(1, body({ name: 'Commerciali', memberIds: [] }), actor('u1'));

      expect(db.delete).toHaveBeenCalled();
      // Only the group's row was written: no members to insert.
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("keeps an all-users group without members", async () => {
      updated = [{ allUsers: true }];
      await service.update(1, body({ name: 'Tutti', memberIds: ['u1'] }), actor('u1'));

      expect(db.delete).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe("the apps' cached permissions", () => {
    it('drop on create, update and delete', async () => {
      await service.create(body({ name: 'Commerciali' }), actor('u1'));
      await service.update(1, body({ name: 'Commerciali' }), actor('u1'));
      await service.delete(1, actor('u1'));
      expect(permissionsVersion.bump).toHaveBeenCalledTimes(3);
    });

    it("don't drop when nothing was written", async () => {
      rowCount = 0;
      await expect(service.delete(1, actor('u1'))).rejects.toBeInstanceOf(NotFoundException);
      expect(permissionsVersion.bump).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('inserts the user group with its creator', async () => {
      await expect(
        service.create(body({ name: 'Name' }), actor('u1')),
      ).resolves.toMatchObject({ ...found, members, memberCount: 1 });

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
    it('updates the user group', async () => {
      await service.update(1, body({ name: 'Name' }), actor('u2'));

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(userGroup.id, 1), notDeleted),
      );
    });

    it('throws 404 when the user group is missing', async () => {
      updated = [];

      await expect(
        service.update(999, body({ name: 'Name' }), actor('u2')),
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
        and(eq(userGroup.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the user group is missing or already deleted', async () => {
      rowCount = 0;

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

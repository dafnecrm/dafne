import { DatabaseService, schema } from '@app/database';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, like } from 'drizzle-orm';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const rows = [{ id: '1', email: 'ada@example.com' }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  const findFirst = vi.fn();
  const db = {
    select: vi.fn(),
    $count: vi.fn(),
    query: { user: { findFirst } },
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    db.select.mockReturnValue(query);
    query.from.mockReturnValue(query);
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.offset.mockResolvedValue(rows);
    db.$count.mockResolvedValue(42);

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: DatabaseService, useValue: { db } }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('lists users with default paging and sorting', async () => {
    await expect(service.getUsersList()).resolves.toEqual({
      users: rows,
      total: 42,
      limit: 20,
      offset: 0,
    });
    expect(query.from).toHaveBeenCalledWith(schema.user);
    expect(query.where).toHaveBeenCalledWith(undefined);
    expect(query.orderBy).toHaveBeenCalledWith(
      desc(schema.user.createdAt),
      asc(schema.user.id),
    );
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(query.offset).toHaveBeenCalledWith(0);
    expect(db.$count).toHaveBeenCalledWith(schema.user, undefined);
  });

  it('passes paging and filters email with contains', async () => {
    await service.getUsersList({ limit: 5, offset: 10, email: 'ada' });

    const where = and(like(schema.user.email, '%ada%'));
    expect(query.where).toHaveBeenCalledWith(where);
    expect(db.$count).toHaveBeenCalledWith(schema.user, where);
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(query.offset).toHaveBeenCalledWith(10);
  });

  it('filters name with contains and escapes LIKE wildcards', async () => {
    await service.getUsersList({ name: '50%_a' });

    expect(query.where).toHaveBeenCalledWith(
      and(like(schema.user.name, '%50\\%\\_a%')),
    );
  });

  it('filters role and banned with equals', async () => {
    await service.getUsersList({ role: 'admin', banned: 'false' });

    expect(query.where).toHaveBeenCalledWith(
      and(eq(schema.user.role, 'admin'), eq(schema.user.banned, false)),
    );
  });

  it('combines every filter with AND', async () => {
    await service.getUsersList({
      email: 'ada',
      name: 'Ada',
      role: 'user',
      banned: 'true',
    });

    expect(query.where).toHaveBeenCalledWith(
      and(
        like(schema.user.email, '%ada%'),
        like(schema.user.name, '%Ada%'),
        eq(schema.user.role, 'user'),
        eq(schema.user.banned, true),
      ),
    );
  });

  it('ignores empty filter values', async () => {
    await service.getUsersList({ email: '', role: '' });

    expect(query.where).toHaveBeenCalledWith(undefined);
  });

  it('sorts by the given field and direction', async () => {
    await service.getUsersList({ sortBy: 'email', sortDirection: 'asc' });

    expect(query.orderBy).toHaveBeenCalledWith(
      asc(schema.user.email),
      asc(schema.user.id),
    );
  });

  describe('getUser', () => {
    it('returns the user with providers and last activity', async () => {
      const lastActive = new Date('2026-10-01T10:00:00Z');
      findFirst.mockResolvedValue({
        id: '1',
        email: 'ada@example.com',
        accounts: [
          { providerId: 'credential' },
          { providerId: 'google' },
          { providerId: 'google' },
        ],
        sessions: [{ updatedAt: lastActive }],
      });

      await expect(service.getUser('1')).resolves.toEqual({
        id: '1',
        email: 'ada@example.com',
        providers: ['credential', 'google'],
        lastActiveAt: lastActive,
      });
      expect(findFirst.mock.calls[0][0]).toMatchObject({ where: { id: '1' } });
    });

    it('has no last activity without sessions', async () => {
      findFirst.mockResolvedValue({ id: '1', accounts: [], sessions: [] });

      await expect(service.getUser('1')).resolves.toMatchObject({
        providers: [],
        lastActiveAt: null,
      });
    });

    it('throws 404 when the user does not exist', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.getUser('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

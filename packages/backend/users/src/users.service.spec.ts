import { authSchema as schema } from '@dafne/backend-database-auth';
import { getDrizzleToken } from '@nestjs/drizzle';
import { AuthService } from '@dafne/backend-auth';
import { createUserBodySchema } from '@dafne/contracts';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { APIError } from 'better-auth/api';
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

  const auth = { createUser: vi.fn(), sendVerificationEmail: vi.fn() };

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
      providers: [
        UsersService,
        { provide: getDrizzleToken(), useValue: db },
        { provide: AuthService, useValue: auth },
      ],
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
    it('returns the user with accounts, active sessions and last activity', async () => {
      const lastActive = new Date('2026-10-01T10:00:00Z');
      const active = {
        id: 's1',
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      };
      const expired = {
        id: 's2',
        updatedAt: lastActive,
        expiresAt: new Date(Date.now() - 60_000),
      };
      const accounts = [
        { id: 'a1', providerId: 'credential' },
        { id: 'a2', providerId: 'google' },
        { id: 'a3', providerId: 'google' },
      ];
      findFirst.mockResolvedValue({
        id: '1',
        email: 'ada@example.com',
        accounts,
        sessions: [active, expired],
      });

      await expect(service.getUser('1')).resolves.toEqual({
        id: '1',
        email: 'ada@example.com',
        providers: ['credential', 'google'],
        accounts,
        lastActiveAt: active.updatedAt,
        sessions: [active],
      });
      expect(findFirst.mock.calls[0][0]).toMatchObject({ where: { id: '1' } });
    });

    it('never selects tokens or passwords', async () => {
      findFirst.mockResolvedValue({ id: '1', accounts: [], sessions: [] });
      await service.getUser('1');

      const { with: relations } = findFirst.mock.calls[0][0];
      expect(relations.sessions.columns).not.toHaveProperty('token');
      expect(relations.accounts.columns).not.toHaveProperty('password');
      expect(relations.accounts.columns).not.toHaveProperty('accessToken');
    });

    it('counts expired sessions as activity', async () => {
      const lastActive = new Date('2026-10-01T10:00:00Z');
      findFirst.mockResolvedValue({
        id: '1',
        accounts: [],
        sessions: [{ updatedAt: lastActive, expiresAt: new Date(0) }],
      });

      await expect(service.getUser('1')).resolves.toMatchObject({
        lastActiveAt: lastActive,
        sessions: [],
      });
    });

    it('has no last activity without sessions', async () => {
      findFirst.mockResolvedValue({ id: '1', accounts: [], sessions: [] });

      await expect(service.getUser('1')).resolves.toMatchObject({
        providers: [],
        accounts: [],
        sessions: [],
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

  describe('createUser', () => {
    const body = createUserBodySchema.parse({
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      password: 'Str0ng!pass',
    });

    it('creates the user unverified, sends the link and returns their detail', async () => {
      auth.createUser.mockResolvedValue('u1');
      findFirst.mockResolvedValue({ id: 'u1', accounts: [], sessions: [] });

      await expect(service.createUser(body)).resolves.toMatchObject({
        id: 'u1',
      });
      expect(auth.createUser).toHaveBeenCalledWith(
        { ...body, role: 'user' },
        { emailVerified: false },
      );
      expect(auth.sendVerificationEmail).toHaveBeenCalledWith(
        'ada@example.com',
      );
      expect(findFirst.mock.calls[0][0].where).toEqual({ id: 'u1' });
    });

    it('still returns the user when the email fails', async () => {
      auth.createUser.mockResolvedValue('u1');
      auth.sendVerificationEmail.mockRejectedValue(new Error('no API key'));
      findFirst.mockResolvedValue({ id: 'u1', accounts: [], sessions: [] });

      await expect(service.createUser(body)).resolves.toMatchObject({
        id: 'u1',
      });
    });

    it('throws 409 when the email is taken', async () => {
      auth.createUser.mockRejectedValue(
        new APIError('BAD_REQUEST', {
          code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
          message: 'User already exists. Use another email.',
        }),
      );

      await expect(service.createUser(body)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(auth.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });
});

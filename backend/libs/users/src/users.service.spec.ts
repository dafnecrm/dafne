import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  const api = { listUsers: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: BetterAuthService, useValue: { api } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('lists users with the caller headers and default paging', async () => {
    const result = { users: [], total: 0 };
    api.listUsers.mockResolvedValue(result);
    const headers = new Headers({ cookie: 'session' });

    await expect(service.getUsersList(headers)).resolves.toBe(result);
    expect(api.listUsers).toHaveBeenCalledWith({
      headers,
      query: {
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      },
    });
  });

  it('passes paging and an email search', async () => {
    api.listUsers.mockResolvedValue({ users: [], total: 0 });

    await service.getUsersList(new Headers(), {
      limit: 5,
      offset: 10,
      search: 'ada',
    });

    expect(api.listUsers.mock.calls[0][0].query).toEqual({
      limit: 5,
      offset: 10,
      sortBy: 'createdAt',
      sortDirection: 'desc',
      searchField: 'email',
      searchOperator: 'contains',
      searchValue: 'ada',
    });
  });

  it('passes the sort field and direction', async () => {
    api.listUsers.mockResolvedValue({ users: [], total: 0 });

    await service.getUsersList(new Headers(), {
      sortBy: 'email',
      sortDirection: 'asc',
    });

    expect(api.listUsers.mock.calls[0][0].query).toMatchObject({
      sortBy: 'email',
      sortDirection: 'asc',
    });
  });

  it('maps Better Auth errors to HTTP errors', async () => {
    api.listUsers.mockRejectedValue(
      new APIError('FORBIDDEN', { message: 'Not allowed' }),
    );

    const error = await service
      .getUsersList(new Headers())
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(403);
  });
});

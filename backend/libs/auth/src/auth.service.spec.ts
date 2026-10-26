import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const api = { createUser: vi.fn() };
  const internalAdapter = { updateUserByEmail: vi.fn() };
  const instance = { $context: Promise.resolve({ internalAdapter }) };
  let env: Record<string, string>;

  async function createService() {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: BetterAuthService, useValue: { api, instance } },
        { provide: ConfigService, useValue: { get: (key: string) => env[key] } },
      ],
    }).compile();
    return module.get(AuthService);
  }

  beforeEach(() => {
    vi.resetAllMocks();
    env = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'Str0ng!pass' };
  });

  it('creates the admin user on init', async () => {
    api.createUser.mockResolvedValue({ user: { id: '1' } });
    const service = await createService();

    await service.onModuleInit();

    expect(api.createUser).toHaveBeenCalledWith({
      body: {
        email: 'admin@example.com',
        password: 'Str0ng!pass',
        name: 'Admin User',
        role: 'admin',
        data: { firstname: 'Admin', lastname: 'User', emailVerified: true },
      },
    });
  });

  it('uses ADMIN_FIRSTNAME and ADMIN_LASTNAME when set', async () => {
    env.ADMIN_FIRSTNAME = 'Ada';
    env.ADMIN_LASTNAME = 'Lovelace';
    api.createUser.mockResolvedValue({ user: { id: '1' } });
    const service = await createService();

    await service.createAdminUser();

    expect(api.createUser.mock.calls[0][0].body).toMatchObject({
      name: 'Ada Lovelace',
      data: { firstname: 'Ada', lastname: 'Lovelace' },
    });
  });

  it('marks an existing admin as verified', async () => {
    api.createUser.mockRejectedValue(
      new APIError('BAD_REQUEST', {
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        message: 'User already exists. Use another email.',
      }),
    );
    const service = await createService();

    await expect(service.createAdminUser()).resolves.toBeUndefined();
    expect(internalAdapter.updateUserByEmail).toHaveBeenCalledWith('admin@example.com', {
      emailVerified: true,
    });
  });

  it('skips when ADMIN_EMAIL or ADMIN_PASSWORD is missing', async () => {
    env = { ADMIN_EMAIL: 'admin@example.com' };
    const service = await createService();

    await service.createAdminUser();

    expect(api.createUser).not.toHaveBeenCalled();
  });

  it('rethrows other errors', async () => {
    const boom = new Error('database down');
    api.createUser.mockRejectedValue(boom);
    const service = await createService();

    await expect(service.createAdminUser()).rejects.toBe(boom);
  });
});

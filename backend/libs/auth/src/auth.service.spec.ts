import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth/api';
import { AuthService } from './auth.service.js';

const SESSION_COOKIE = 'tiny-crm.session_token=abc; Path=/; HttpOnly';

/** Fake Better Auth response with a Set-Cookie header. */
function betterAuthReply<T>(response: T) {
  const headers = new Headers();
  headers.append('set-cookie', SESSION_COOKIE);
  return { headers, response };
}

describe('AuthService', () => {
  let service: AuthService;
  const api = {
    signUpEmail: vi.fn(),
    signInEmail: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: BetterAuthService, useValue: { api } }],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signUp', () => {
    const dto = {
      firstname: 'Mario',
      lastname: 'Rossi',
      email: 'mario@example.com',
      password: 'password123',
    };

    it('creates the user with a name built from firstname and lastname', async () => {
      api.signUpEmail.mockResolvedValue(betterAuthReply({ token: 't', user: { id: '1' } }));
      const headers = new Headers({ 'user-agent': 'vitest' });

      await service.signUp(dto, headers);

      expect(api.signUpEmail).toHaveBeenCalledWith({
        body: {
          name: 'Mario Rossi',
          firstname: 'Mario',
          lastname: 'Rossi',
          email: 'mario@example.com',
          password: 'password123',
        },
        headers,
        returnHeaders: true,
      });
    });

    it('returns the response and the session cookies', async () => {
      const response = { token: 't', user: { id: '1' } };
      api.signUpEmail.mockResolvedValue(betterAuthReply(response));

      const result = await service.signUp(dto, new Headers());

      expect(result).toEqual({ response, cookies: [SESSION_COOKIE] });
    });

    it('maps a Better Auth error to an HttpException with the same status', async () => {
      api.signUpEmail.mockRejectedValue(
        new APIError('UNPROCESSABLE_ENTITY', { message: 'User already exists' }),
      );

      const error = await service.signUp(dto, new Headers()).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(422);
      expect((error as HttpException).getResponse()).toMatchObject({
        message: 'User already exists',
      });
    });
  });

  describe('signIn', () => {
    const dto = { email: 'mario@example.com', password: 'password123', rememberMe: true };

    it('signs in with the given credentials', async () => {
      api.signInEmail.mockResolvedValue(betterAuthReply({ token: 't', user: { id: '1' } }));
      const headers = new Headers();

      await service.signIn(dto, headers);

      expect(api.signInEmail).toHaveBeenCalledWith({
        body: { email: 'mario@example.com', password: 'password123', rememberMe: true },
        headers,
        returnHeaders: true,
      });
    });

    it('returns the response and the session cookies', async () => {
      const response = { redirect: false, token: 't', user: { id: '1' } };
      api.signInEmail.mockResolvedValue(betterAuthReply(response));

      const result = await service.signIn(dto, new Headers());

      expect(result).toEqual({ response, cookies: [SESSION_COOKIE] });
    });

    it('maps invalid credentials to a 401 HttpException', async () => {
      api.signInEmail.mockRejectedValue(
        new APIError('UNAUTHORIZED', { message: 'Invalid email or password' }),
      );

      const error = await service.signIn(dto, new Headers()).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(401);
    });

    it('rethrows errors that do not come from Better Auth', async () => {
      const boom = new Error('database down');
      api.signInEmail.mockRejectedValue(boom);

      await expect(service.signIn(dto, new Headers())).rejects.toBe(boom);
    });
  });
});

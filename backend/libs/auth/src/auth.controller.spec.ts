import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { SignUpDto } from './dto/sign-up.dto.js';

const SESSION_COOKIE = 'tiny-crm.session_token=abc; Path=/; HttpOnly';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = { signUp: vi.fn(), signIn: vi.fn() };

  const req = { headers: { 'user-agent': 'vitest' } } as unknown as Request;
  let res: Response;

  beforeEach(async () => {
    vi.resetAllMocks();
    res = { setHeader: vi.fn() } as unknown as Response;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('signUp', () => {
    const body: SignUpDto = {
      firstname: 'Mario',
      lastname: 'Rossi',
      email: 'mario@example.com',
      password: 'password123',
    };

    it('passes the body and request headers to the service', async () => {
      authService.signUp.mockResolvedValue({ response: {}, cookies: [] });

      await controller.signUp(body, req, res);

      const [dto, headers] = authService.signUp.mock.calls[0];
      expect(dto).toBe(body);
      expect(headers).toBeInstanceOf(Headers);
      expect(headers.get('user-agent')).toBe('vitest');
    });

    it('sets the session cookie and returns the response body', async () => {
      const response = { token: 't', user: { id: '1' } };
      authService.signUp.mockResolvedValue({ response, cookies: [SESSION_COOKIE] });

      const result = await controller.signUp(body, req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', [SESSION_COOKIE]);
      expect(result).toBe(response);
    });
  });

  describe('signIn', () => {
    const body: SignInDto = { email: 'mario@example.com', password: 'password123' };

    it('sets the session cookie and returns the response body', async () => {
      const response = { redirect: false, token: 't', user: { id: '1' } };
      authService.signIn.mockResolvedValue({ response, cookies: [SESSION_COOKIE] });

      const result = await controller.signIn(body, req, res);

      expect(authService.signIn).toHaveBeenCalledWith(body, expect.any(Headers));
      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', [SESSION_COOKIE]);
      expect(result).toBe(response);
    });

    it('does not set a cookie when Better Auth returns none', async () => {
      authService.signIn.mockResolvedValue({ response: {}, cookies: [] });

      await controller.signIn(body, req, res);

      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });
});

// Same options as the global pipe in apps/api/src/main.ts.
describe('Auth DTO validation', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (metatype: ArgumentMetadata['metatype'], value: unknown) =>
    pipe.transform(value, { type: 'body', metatype });

  const messages = async (metatype: ArgumentMetadata['metatype'], value: unknown) => {
    const error = await validate(metatype, value).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).getResponse() as { message: string[] };
  };

  describe('SignUpDto', () => {
    const valid = {
      firstname: 'Mario',
      lastname: 'Rossi',
      email: 'mario@example.com',
      password: 'password123',
    };

    it('accepts a valid body', async () => {
      await expect(validate(SignUpDto, valid)).resolves.toBeInstanceOf(SignUpDto);
    });

    it('rejects missing names, an invalid email and a short password', async () => {
      const { message } = await messages(SignUpDto, {
        firstname: '',
        email: 'not-an-email',
        password: 'short',
      });

      expect(message).toEqual(
        expect.arrayContaining([
          'firstname should not be empty',
          'lastname should not be empty',
          'email must be an email',
          'password must be longer than or equal to 8 characters',
        ]),
      );
    });

    it('rejects unknown properties', async () => {
      const { message } = await messages(SignUpDto, { ...valid, role: 'admin' });

      expect(message).toContain('property role should not exist');
    });
  });

  describe('SignInDto', () => {
    it('accepts a valid body with an optional rememberMe', async () => {
      await expect(
        validate(SignInDto, { email: 'mario@example.com', password: 'x', rememberMe: true }),
      ).resolves.toBeInstanceOf(SignInDto);
    });

    it('rejects an invalid email, an empty password and a non-boolean rememberMe', async () => {
      const { message } = await messages(SignInDto, {
        email: 'nope',
        password: '',
        rememberMe: 'yes',
      });

      expect(message).toEqual(
        expect.arrayContaining([
          'email must be an email',
          'password should not be empty',
          'rememberMe must be a boolean value',
        ]),
      );
    });
  });
});

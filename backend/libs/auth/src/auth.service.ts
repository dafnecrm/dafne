import { HttpException, Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { isAPIError } from 'better-auth/api';
import type { Auth } from './auth.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { SignUpDto } from './dto/sign-up.dto.js';

/** Result of an auth call: the response body plus the session cookies to send back. */
export interface AuthResult<T> {
  response: T;
  cookies: string[];
}

@Injectable()
export class AuthService {
  constructor(private readonly betterAuth: BetterAuthService<Auth>) {}

  signUp(dto: SignUpDto, headers: Headers) {
    return this.run(() =>
      this.betterAuth.api.signUpEmail({
        body: {
          name: `${dto.firstname} ${dto.lastname}`,
          firstname: dto.firstname,
          lastname: dto.lastname,
          email: dto.email,
          password: dto.password,
        },
        headers,
        returnHeaders: true,
      }),
    );
  }

  signIn(dto: SignInDto, headers: Headers) {
    return this.run(() =>
      this.betterAuth.api.signInEmail({
        body: {
          email: dto.email,
          password: dto.password,
          rememberMe: dto.rememberMe,
        },
        headers,
        returnHeaders: true,
      }),
    );
  }

  /**
   * Calls a Better Auth endpoint, collects its session cookies and
   * turns Better Auth errors into Nest HTTP errors.
   */
  private async run<T>(
    call: () => Promise<{ headers: Headers; response: T }>,
  ): Promise<AuthResult<T>> {
    try {
      const { headers, response } = await call();
      return { response, cookies: headers.getSetCookie() };
    } catch (error) {
      if (isAPIError(error)) {
        throw new HttpException(error.body ?? error.message, error.statusCode);
      }
      throw error;
    }
  }
}

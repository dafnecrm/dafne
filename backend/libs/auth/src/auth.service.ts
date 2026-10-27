import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { isAPIError } from 'better-auth/api';
import type { CreateUserBody } from '@app/contracts';
import type { Auth } from './auth.js';

/**
 * Frontend page that verification links send the user back to (the
 * frontend's app/(auth)/verify-email, also used by sign-up).
 */
export const VERIFY_EMAIL_CALLBACK_PATH = '/verify-email';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly betterAuth: BetterAuthService<Auth>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Runs after DatabaseService has applied the migrations
   * (AuthModule imports DatabaseModule, so it is initialised first).
   */
  async onModuleInit() {
    await this.createAdminUser();
  }

  /**
   * Creates a user and returns their ID. No email is sent: an unverified
   * user can't sign in until they get one (see sendVerificationEmail).
   * Throws Better Auth's APIError, e.g. code
   * USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL.
   *
   * Called without headers, so the admin plugin allows it without a
   * session: callers check permissions themselves.
   */
  async createUser(
    { firstname, lastname, email, password, role }: CreateUserBody,
    { emailVerified }: { emailVerified: boolean },
  ) {
    const { user } = await this.betterAuth.api.createUser({
      body: {
        email,
        password,
        name: `${firstname} ${lastname}`,
        role,
        data: { firstname, lastname, emailVerified },
      },
    });
    return user.id;
  }

  /**
   * Sends the verification link, as sign-up does. Clicking it verifies the
   * email and signs the user in.
   */
  async sendVerificationEmail(email: string) {
    await this.betterAuth.api.sendVerificationEmail({
      body: { email, callbackURL: VERIFY_EMAIL_CALLBACK_PATH },
    });
  }

  /**
   * Creates the admin user from ADMIN_EMAIL / ADMIN_PASSWORD (and optional
   * ADMIN_FIRSTNAME / ADMIN_LASTNAME) if it doesn't exist yet.
   */
  async createAdminUser() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL or ADMIN_PASSWORD not set: skipping admin user creation',
      );
      return;
    }
    const firstname = this.config.get<string>('ADMIN_FIRSTNAME') ?? 'Admin';
    const lastname = this.config.get<string>('ADMIN_LASTNAME') ?? 'User';

    try {
      // Verified: the admin has no link to click.
      await this.createUser(
        { firstname, lastname, email, password, role: 'admin' },
        { emailVerified: true },
      );
      this.logger.log(`Admin user ${email} created`);
    } catch (error) {
      if (
        isAPIError(error) &&
        error.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
      ) {
        // Admins created before verification was required are still unverified.
        const { internalAdapter } = await this.betterAuth.instance.$context;
        await internalAdapter.updateUserByEmail(email, { emailVerified: true });
        this.logger.log(`Admin user ${email} already exists`);
        return;
      }
      throw error;
    }
  }
}

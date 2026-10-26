import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { isAPIError } from 'better-auth/api';
import type { Auth } from './auth.js';

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
   * Creates the admin user from ADMIN_EMAIL / ADMIN_PASSWORD (and optional
   * ADMIN_FIRSTNAME / ADMIN_LASTNAME) if it doesn't exist yet.
   */
  async createAdminUser() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not set: skipping admin user creation');
      return;
    }
    const firstname = this.config.get<string>('ADMIN_FIRSTNAME') ?? 'Admin';
    const lastname = this.config.get<string>('ADMIN_LASTNAME') ?? 'User';

    try {
      // Called without headers, so the admin plugin allows it without a session.
      await this.betterAuth.api.createUser({
        body: {
          email,
          password,
          name: `${firstname} ${lastname}`,
          role: 'admin',
          // Sign-in requires a verified email; the admin has no link to click.
          data: { firstname, lastname, emailVerified: true },
        },
      });
      this.logger.log(`Admin user ${email} created`);
    } catch (error) {
      if (isAPIError(error) && error.body?.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
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

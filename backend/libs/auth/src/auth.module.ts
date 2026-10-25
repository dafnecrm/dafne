import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseModule, DatabaseService } from '@app/database';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { createAuth } from './auth.js';

@Module({
  imports: [
    DatabaseModule,
    BetterAuthModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [DatabaseService, ConfigService],
      useFactory: (database: DatabaseService, config: ConfigService) => ({
        auth: createAuth(database.db, {
          secret: config.getOrThrow<string>('BETTER_AUTH_SECRET'),
          baseURL: config.get<string>('BETTER_AUTH_URL'),
          trustedOrigins: config.get<string>('TRUSTED_ORIGINS')?.split(','),
        }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

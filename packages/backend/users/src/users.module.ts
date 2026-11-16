import { AuthModule } from '@dafne/backend-auth';
import { ChangelogModule } from '@dafne/backend-changelog';
import { AuthDatabaseModule } from '@dafne/backend-database-auth';
import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [AuthDatabaseModule, AuthModule, ChangelogModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

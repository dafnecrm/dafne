import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  Session,
  AllowAnonymous,
  OptionalAuth,
  Roles,
} from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '@dafne/backend-common';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  type CreateUserBody,
  type ListUsersQuery,
  type UserDetail,
  type UsersList,
} from '@dafne/contracts';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Get('public')
  @AllowAnonymous() // Allow anonymous access
  async getPublic() {
    return { message: 'Public route' };
  }

  @Get('optional')
  @OptionalAuth() // Authentication is optional
  async getOptional(@Session() session: UserSession) {
    return { authenticated: !!session };
  }

  @Get('/list')
  @Roles(['admin'])
  async getUsersList(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<UsersList> {
    return this.usersService.getUsersList(query);
  }

  @Post()
  @Roles(['admin'])
  async createUser(
    @Body(new ZodValidationPipe(createUserBodySchema)) body: CreateUserBody,
  ): Promise<UserDetail> {
    return this.usersService.createUser(body);
  }

  /** Declared last so it doesn't catch /users/me, /users/list… */
  @Get(':id')
  @Roles(['admin'])
  async getUser(@Param('id') id: string): Promise<UserDetail> {
    return this.usersService.getUser(id);
  }
}

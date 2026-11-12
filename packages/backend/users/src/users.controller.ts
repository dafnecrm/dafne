import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Session, Roles } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '@dafne/backend-common';
import type { CrudController } from '@dafne/backend-crud';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  type CreateUserBody,
  type ListUsersQuery,
  type UserDetail,
  type UsersList,
} from '@dafne/contracts';
import { UsersService } from './users.service.js';

/**
 * Users: list, get and create, for admins (Better Auth's session, in
 * apps/auth). No update or delete yet; `me` is the signed-in user.
 */
@Controller('users')
export class UsersController
  implements
    Pick<
      CrudController<string, ListUsersQuery, UsersList, CreateUserBody, UserDetail>,
      'list' | 'get' | 'create'
    >
{
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Get()
  @Roles(['admin'])
  async list(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<UsersList> {
    return this.usersService.list(query);
  }

  @Post()
  @Roles(['admin'])
  async create(
    @Body(new ZodValidationPipe(createUserBodySchema)) body: CreateUserBody,
  ): Promise<UserDetail> {
    return this.usersService.create(body);
  }

  /** Declared last so it doesn't catch /users/me. */
  @Get(':id')
  @Roles(['admin'])
  async get(@Param('id') id: string): Promise<UserDetail> {
    return this.usersService.get(id);
  }
}

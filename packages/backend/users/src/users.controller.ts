import { Body, Controller, ForbiddenException, Get, Param, Post, Query } from '@nestjs/common';
import { Session, Roles } from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ZodValidationPipe } from '@dafne/backend-common';
import type { CrudController } from '@dafne/backend-crud';
import { USERS_RESOURCE } from '@dafne/backend-auth';
import { ChangelogService } from '@dafne/backend-changelog';
import {
  ADMIN_ROLES,
  createUserBodySchema,
  isSuperAdmin,
  msg,
  listChangesQuerySchema,
  listUsersQuerySchema,
  type ChangesList,
  type CreateUserBody,
  type ListChangesQuery,
  type ListUsersQuery,
  type UserDetail,
  type UsersList,
} from '@dafne/contracts';
import { UsersService } from './users.service.js';

/**
 * Users: list, get and create, and their change log, for admins and
 * super-admins (Better
 * Auth's session, in apps/auth). No update or delete yet; `me` is the
 * signed-in user.
 */
@Controller('users')
export class UsersController
  implements
    Pick<
      CrudController<string, ListUsersQuery, UsersList, CreateUserBody, UserDetail>,
      'list' | 'get' | 'create'
    >
{
  constructor(
    private usersService: UsersService,
    private changelog: ChangelogService,
  ) {}

  @Get('me')
  async getProfile(@Session() session: UserSession) {
    return { user: session.user };
  }

  @Get()
  @Roles([...ADMIN_ROLES])
  async list(
    @Query(new ZodValidationPipe(listUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<UsersList> {
    return this.usersService.list(query);
  }

  @Post()
  @Roles([...ADMIN_ROLES])
  async create(
    @Body(new ZodValidationPipe(createUserBodySchema)) body: CreateUserBody,
    // Only the role matters here (Better Auth's session or the CRUD interface's).
    @Session() session: { user: { role?: string | string[] | null } },
  ): Promise<UserDetail> {
    // Only a super-admin grants super-admin (Better Auth's own endpoints
    // are checked by the auth options' superAdminGuard).
    if (isSuperAdmin(body.role) && !isSuperAdmin(session.user.role)) {
      throw new ForbiddenException(msg('users.role.superAdminRequired'));
    }
    return this.usersService.create(body);
  }

  /**
   * The changes of a user (Better Auth's writes: profile, email, role,
   * ban, verification), newest first. 404 if they don't exist.
   */
  @Get(':id/changes')
  @Roles([...ADMIN_ROLES])
  async changes(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.usersService.get(id);
    return this.changelog.list(USERS_RESOURCE, id, query);
  }

  /** Declared last so it doesn't catch /users/me. */
  @Get(':id')
  @Roles([...ADMIN_ROLES])
  async get(@Param('id') id: string): Promise<UserDetail> {
    return this.usersService.get(id);
  }
}

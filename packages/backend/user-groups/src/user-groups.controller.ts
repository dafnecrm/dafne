import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles, Session } from '@thallesp/nestjs-better-auth';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  ADMIN_ROLES,
  userGroupBodySchema,
  listUserGroupsQuerySchema,
  type UserGroupBody,
  type UserGroupDetail,
  type UserGroupsList,
  type ListUserGroupsQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { UserGroupsService } from './user-groups.service.js';

/** Only the user matters here (Better Auth's session or the CRUD interface's). */
interface Signed {
  user: { id: string };
}

/**
 * The user groups and their members, shared by every app (apps/auth):
 * admins and super-admins, like the users they pick from. What a group can
 * do is set on each app (PUT /user-groups/:id/permissions on its API).
 */
@Roles([...ADMIN_ROLES])
@Controller('user-groups')
export class UserGroupsController implements CrudController<
  number,
  ListUserGroupsQuery,
  UserGroupsList,
  UserGroupBody,
  UserGroupDetail
> {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listUserGroupsQuerySchema))
    query: ListUserGroupsQuery,
  ): Promise<UserGroupsList> {
    return this.userGroupsService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<UserGroupDetail> {
    return this.userGroupsService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(userGroupBodySchema)) body: UserGroupBody,
    @Session() session: Signed,
  ): Promise<UserGroupDetail> {
    return this.userGroupsService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(userGroupBodySchema)) body: UserGroupBody,
    @Session() session: Signed,
  ): Promise<UserGroupDetail> {
    return this.userGroupsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: Signed,
  ): Promise<void> {
    await this.userGroupsService.delete(id, session.user);
  }
}

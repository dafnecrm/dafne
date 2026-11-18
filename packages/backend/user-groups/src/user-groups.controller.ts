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
import { Roles, Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  userGroupBodySchema,
  listUserGroupsQuerySchema,
  type UserGroupBody,
  type UserGroupDetail,
  type UserGroupsList,
  type ListUserGroupsQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { UserGroupsService } from './user-groups.service.js';

/**
 * User groups, their members and permissions: admins only (of the app, or
 * global). Which agents a group can use is set on the agent (super-admins).
 */
@Roles(['admin'])
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
    @Session() session: UserSession,
  ): Promise<UserGroupDetail> {
    return this.userGroupsService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(userGroupBodySchema)) body: UserGroupBody,
    @Session() session: UserSession,
  ): Promise<UserGroupDetail> {
    return this.userGroupsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.userGroupsService.delete(id, session.user);
  }
}

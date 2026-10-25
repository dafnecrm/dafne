import { Controller, Get, Query } from '@nestjs/common';
import {
  Session,
  AllowAnonymous,
  OptionalAuth,
  Roles,
} from '@thallesp/nestjs-better-auth';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
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
  async getUsersList(@Query() query: ListUsersQueryDto) {
    return this.usersService.getUsersList(query);
  }
}

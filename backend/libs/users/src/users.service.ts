import { Auth } from '@app/auth';
import { HttpException, Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { isAPIError } from 'better-auth/api';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';

export const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class UsersService {
  constructor(private readonly betterAuth: BetterAuthService<Auth>) {}

  /**
   * Lists users with Better Auth's admin API. `headers` must carry the
   * caller's session: Better Auth only allows admins to list users.
   */
  async getUsersList(
    headers: Headers,
    { limit, offset, search }: ListUsersQueryDto = {},
  ) {
    try {
      return await this.betterAuth.api.listUsers({
        headers,
        query: {
          limit: limit ?? DEFAULT_PAGE_SIZE,
          offset: offset ?? 0,
          sortBy: 'createdAt',
          sortDirection: 'desc',
          ...(search && {
            searchField: 'email',
            searchOperator: 'contains',
            searchValue: search,
          }),
        },
      });
    } catch (error) {
      // e.g. 401 without a session, 403 for non-admins
      if (isAPIError(error))
        throw new HttpException(error.body ?? error.message, error.statusCode);
      throw error;
    }
  }
}

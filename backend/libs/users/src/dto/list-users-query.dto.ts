import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** User fields the list can be sorted by. */
export const USER_SORT_FIELDS = [
  'name',
  'email',
  'role',
  'banned',
  'createdAt',
] as const;
export type UserSortField = (typeof USER_SORT_FIELDS)[number];

/**
 * User fields the list can be filtered by, each a query param of its own.
 * Filters combine with AND; the service picks the operator for each one
 * (contains for email and name, equals for role and banned).
 */
export const USER_FILTER_FIELDS = ['email', 'name', 'role', 'banned'] as const;
export type UserFilterField = (typeof USER_FILTER_FIELDS)[number];

/** Query string of GET /users/list. */
export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  /** Emails containing this text. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  /** Names containing this text. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** Exact role, e.g. "admin". */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string;

  /** "true" for banned users, "false" for active ones. */
  @IsOptional()
  @IsIn(['true', 'false'])
  banned?: 'true' | 'false';

  /** Defaults to createdAt. */
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sortBy?: UserSortField;

  /** Defaults to desc. */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

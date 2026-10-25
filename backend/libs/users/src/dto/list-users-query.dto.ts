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

  /** Matches emails containing this text. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  /** Defaults to createdAt. */
  @IsOptional()
  @IsIn(USER_SORT_FIELDS)
  sortBy?: UserSortField;

  /** Defaults to desc. */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

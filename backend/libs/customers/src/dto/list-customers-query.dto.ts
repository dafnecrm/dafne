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

/** Customer fields the list can be sorted by. */
export const CUSTOMER_SORT_FIELDS = [
  'name',
  'email',
  'phone',
  'createdAt',
  'updatedAt',
] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

/**
 * Customer fields the list can be filtered by, each a query param of its
 * own. Filters combine with AND and match text the field contains.
 */
export const CUSTOMER_FILTER_FIELDS = ['name', 'email', 'phone'] as const;
export type CustomerFilterField = (typeof CUSTOMER_FILTER_FIELDS)[number];

/** Query string of GET /customers. Deleted customers are never listed. */
export class ListCustomersQueryDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  /** Defaults to name. */
  @IsOptional()
  @IsIn(CUSTOMER_SORT_FIELDS)
  sortBy?: CustomerSortField;

  /** Defaults to asc. */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection?: 'asc' | 'desc';
}

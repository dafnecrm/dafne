import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Trims strings; an empty one becomes null (an optional field left blank). */
const trimToNull = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  );

/** Trims strings, so a blank required field fails IsNotEmpty. */
const trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

/** Digits, spaces, dashes, dots, parentheses, with an optional leading +. */
export const PHONE_PATTERN = /^\+?[0-9 ().-]{5,32}$/;

export class CustomerAddressDto {
  /** e.g. "Billing", "Shipping". */
  @IsOptional()
  @trimToNull()
  @IsString()
  @MaxLength(100)
  label?: string | null;

  @trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  street: string;

  @trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @IsOptional()
  @trimToNull()
  @IsString()
  @MaxLength(20)
  postalCode?: string | null;

  /** State, province or region. */
  @IsOptional()
  @trimToNull()
  @IsString()
  @MaxLength(100)
  region?: string | null;

  @trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;
}

/**
 * Body of POST /customers and PUT /customers/:id. PUT replaces the whole
 * customer, addresses included: omitted optional fields are cleared.
 */
export class CustomerBodyDto {
  @trim()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @trimToNull()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @IsOptional()
  @trimToNull()
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  /** In display order. Defaults to none. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addresses?: CustomerAddressDto[];
}

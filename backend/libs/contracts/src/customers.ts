import { z } from 'zod';
import {
  optionalText,
  pageQuery,
  requiredText,
  SORT_DIRECTIONS,
} from './common.ts';

/* ---------- Requests ---------- */

/** Digits, spaces, dashes, dots, parentheses, with an optional leading +. */
export const PHONE_PATTERN = /^\+?[0-9 ().-]{5,32}$/;

/** Values of customer address type. */
export const CUSTOMER_ADDRESS_TYPES = [
  'head_office',
  'shipping',
  'billing',
] as const;
export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPES)[number];

export const customerAddressBodySchema = z.strictObject({
  type: z
    .enum(CUSTOMER_ADDRESS_TYPES, { error: 'Choose the type' })
    .nullish()
    .transform((value) => value ?? null),
  street: requiredText(255, 'Enter the street'),
  city: requiredText(100, 'Enter the city'),
  postalCode: optionalText(z.string().max(20)),
  /** State, province or region. */
  region: optionalText(z.string().max(100)),
  country: requiredText(100, 'Enter the country'),
});

/**
 * Body of POST /customers and PUT /customers/:id. PUT replaces the whole
 * customer, addresses included: omitted optional fields are cleared.
 */
export const customerBodySchema = z.strictObject({
  name: requiredText(255, 'Enter the name'),
  email: optionalText(
    z.email({ error: 'Enter a valid email address' }).max(255),
  ),
  phone: optionalText(
    z.string().regex(PHONE_PATTERN, { error: 'Enter a valid phone number' }),
  ),
  /** In display order. */
  addresses: z.array(customerAddressBodySchema).max(20).default([]),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type CustomerBodyInput = z.input<typeof customerBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type CustomerBody = z.output<typeof customerBodySchema>;
export type CustomerAddressBody = CustomerBody['addresses'][number];

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
export const listCustomersQuerySchema = z.strictObject({
  ...pageQuery,
  name: z.string().max(255).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(32).optional(),
  /** Defaults to name. */
  sortBy: z.enum(CUSTOMER_SORT_FIELDS).optional(),
  /** Defaults to asc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListCustomersQuery = z.output<typeof listCustomersQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A customer in GET /customers. */
export interface ListedCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /customers. */
export interface CustomersList {
  customers: ListedCustomer[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustomerAddress {
  id: string;
  type: CustomerAddressType | null;
  street: string;
  city: string;
  postalCode: string | null;
  /** State, province or region. */
  region: string | null;
  country: string;
}

/** A user who created or last updated a customer; null if since removed. */
export interface CustomerUser {
  id: string;
  name: string;
}

/** Response of GET /customers/:id, POST /customers and PUT /customers/:id. */
export interface CustomerDetail extends ListedCustomer {
  /** In display order. */
  addresses: CustomerAddress[];
  createdBy: CustomerUser | null;
  updatedBy: CustomerUser | null;
  /** Always null: deleted customers aren't returned. */
  deletedAt: Date | null;
}

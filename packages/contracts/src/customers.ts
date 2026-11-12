import { z } from 'zod';
import {
  optionalText,
  pageQuery,
  requiredText,
  SORT_DIRECTIONS,
  optionalDate,
  type Page,
} from './common.ts';
import { msg } from './messages/index.ts';

/* ---------- Requests ---------- */

/** Digits, spaces, dashes, dots, parentheses, with an optional leading +. */
export const PHONE_PATTERN = /^\+?[0-9 ().-]{5,32}$/;

/**
 * Italian codice fiscale of a person: 16 characters. Digits may be replaced
 * by letters (omocodia), so those positions also take LMNPQRSTUV.
 */
export const FISCAL_CODE_PATTERN =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;

/** Italian partita IVA: 11 digits, optionally after "IT". */
export const VAT_NUMBER_PATTERN = /^(IT)?[0-9]{11}$/;

/** Values of customer address type. */
export const CUSTOMER_ADDRESS_TYPES = ['residence', 'domicile', 'head_office', 'shipping', 'billing'] as const;
export type CustomerAddressType = (typeof CUSTOMER_ADDRESS_TYPES)[number];

export const customerAddressBodySchema = z.strictObject({
  type: z.enum(CUSTOMER_ADDRESS_TYPES, {
      error: msg('customerAddresses.type.required'),
    }),
  street: requiredText(255, msg('customerAddresses.street.required')),
  city: requiredText(100, msg('customerAddresses.city.required')),
  postalCode: optionalText(z.string().max(20)),
  /** State, province or region. */
    region: optionalText(z.string().max(100)),
  /** ISO 3166-1 alpha-2 code of one of the countries, e.g. "IT". */
    countryCode: z
      .string({ error: msg('customerAddresses.countryCode.required') })
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, {
        error: msg('customerAddresses.countryCode.required'),
      }),
});

/** Values of customer type: a natural person or a company. */
export const CUSTOMER_TYPES = ['person', 'company'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

/**
 * Body of POST /customers and PUT /customers/:id. PUT replaces the whole
 * customer, addresses included: omitted optional fields are cleared.
 */
export const customerBodySchema = z
  .strictObject({
    type: z.enum(CUSTOMER_TYPES, { error: msg('customers.type.required') }),
    name: requiredText(255, msg('customers.name.required')),
    birthDate: optionalDate(msg('common.date.invalid')),
    /** Persons only: the Italian codice fiscale, saved in upper case. */
        fiscalCode: optionalText(
          z
            .string()
            .toUpperCase()
            .regex(FISCAL_CODE_PATTERN, {
              error: msg('customers.fiscalCode.invalid'),
            }),
        ),
    /** Companies only: the Italian partita IVA, with or without "IT". */
        vatNumber: optionalText(
          z
            .string()
            .toUpperCase()
            .regex(VAT_NUMBER_PATTERN, {
              error: msg('customers.vatNumber.invalid'),
            }),
        ),
    /** Unique among customers, deleted ones included. */
        email: requiredText(255, msg('customers.email.required')).pipe(
          z.email({ error: msg('common.email.invalid') }),
        ),
    phone: optionalText(
          z
            .string()
            .regex(PHONE_PATTERN, { error: msg('customers.phone.invalid') }),
        ),
    /** In display order; at most one address of each type. */
        addresses: z
          .array(customerAddressBodySchema)
          .max(20)
          .default([])
          .superRefine((addresses, ctx) =>
            addresses.forEach((address, i) => {
              if (addresses.findIndex((a) => a.type === address.type) < i) {
                ctx.addIssue({
                  code: 'custom',
                  path: [i, 'type'],
                  message: msg('customers.addresses.typeTaken'),
                });
              }
            }),
          ),
  })
  .transform((body) =>
    // Each type keeps only its own fields: the other type's are cleared.
    body.type === 'person'
      ? { ...body, vatNumber: null }
      : { ...body, birthDate: null, fiscalCode: null },
  );

/** What a client sends: blank optional fields may be "", null or missing. */
export type CustomerBodyInput = z.input<typeof customerBodySchema>;
/** What the backend gets after validation: blanks are null. */
export type CustomerBody = z.output<typeof customerBodySchema>;
export type CustomerAddressBody = CustomerBody['addresses'][number];

/** Customer fields the list can be sorted by. */
export const CUSTOMER_SORT_FIELDS = ['id', 'type', 'name', 'email', 'phone', 'createdAt', 'updatedAt'] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

/**
 * Customer fields the list can be filtered by, each a query param of its
 * own. Filters combine with AND and match text the field contains
 * (the id matches exactly).
 */
export const CUSTOMER_FILTER_FIELDS = ['id', 'type', 'name', 'email', 'phone'] as const;
export type CustomerFilterField = (typeof CUSTOMER_FILTER_FIELDS)[number];

/** Query string of GET /customers. Deleted customers are never listed. */
export const listCustomersQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
      .string()
      .regex(/^\s*\d{0,9}\s*$/)
      .optional(),
  type: z.enum(CUSTOMER_TYPES).optional(),
  name: z.string().max(255).optional(),
  email: z.string().max(255).optional(),
  phone: z.string().max(32).optional(),
  /** Free text: customers whose id is it or whose name contains it. */
  search: z.string().max(255).optional(),
  /** Defaults to id. */
    sortBy: z.enum(CUSTOMER_SORT_FIELDS).optional(),
  /** Defaults to desc. */
    sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListCustomersQuery = z.output<typeof listCustomersQuerySchema>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A customer in GET /customers. */
export interface ListedCustomer {
  id: number;
  type: CustomerType;
  name: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /customers. */
export type CustomersList = Page<ListedCustomer>;

export interface CustomerAddress {
  id: number;
  type: CustomerAddressType;
  street: string;
  city: string;
  postalCode: string | null;
  /** State, province or region. */
    region: string | null;
  countryCode: string;
  country: CustomerAddressCountry;
}

/** The country of an address. */
export interface CustomerAddressCountry {
  name: string;
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
  birthDate: Date | null;
  fiscalCode: string | null;
  vatNumber: string | null;
  /** Always null: deleted customers aren't returned. */
    deletedAt: Date | null;
}

import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  integer,
  timestamp,
  varchar,
  serial,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * A customer managed by the users. Deletion is logical: `deletedAt` is set
 * and the row is hidden from every query, but kept in the table.
 */
export const customer = salesSchema.table(
  'customer',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the customers they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    index('customer_deletedAt_idx').on(table.deletedAt),
    index('customer_name_idx').on(table.name),
  ],
);

/**
 * One of a customer's addresses. The list is replaced as a whole when the
 * customer is saved; `position` keeps the order it was entered in.
 */
export const customerAddress = salesSchema.table(
  'customer_address',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    /** e.g. "Billing", "Shipping", "Head office". */
    label: varchar('label', { length: 100 }),
    street: varchar('street', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 20 }),
    /** State, province or region. */
    region: varchar('region', { length: 100 }),
    country: varchar('country', { length: 100 }).notNull(),
  },
  (table) => [index('customer_address_customerId_idx').on(table.customerId)],
);

export const customerRelations = defineRelationsPart(
  { user, customer, customerAddress },
  (r) => ({
    customer: {
      addresses: r.many.customerAddress({
        from: r.customer.id,
        to: r.customerAddress.customerId,
      }),
      createdBy: r.one.user({
        from: r.customer.createdById,
        to: r.user.id,
        alias: 'customerCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.customer.updatedById,
        to: r.user.id,
        alias: 'customerUpdatedBy',
      }),
    },
    customerAddress: {
      customer: r.one.customer({
        from: r.customerAddress.customerId,
        to: r.customer.id,
        optional: false,
      }),
    },
  }),
);

import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { user } from './auth.js';

/**
 * A customer managed by the users. Deletion is logical: `deletedAt` is set
 * and the row is hidden from every query, but kept in the table.
 */
export const customer = mysqlTable(
  'customer',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { fsp: 3 }),
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
export const customerAddress = mysqlTable(
  'customer_address',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    customerId: varchar('customer_id', { length: 36 })
      .notNull()
      .references(() => customer.id, { onDelete: 'cascade' }),
    position: int('position').notNull(),
    /** e.g. "Billing", "Shipping", "Head office". */
    type: mysqlEnum(['head_office', 'shipping', 'billing',]),
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

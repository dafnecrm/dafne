import { defineRelations } from 'drizzle-orm';
// auth.ts re-exports the users' table of the auth schema (@dafne/backend-database-auth),
// outside tables/: drizzle-kit would put it in this package's migrations.
import * as auth from './auth.js';
import * as customers from './tables/customers.js';
import * as activities from './tables/activities.js';
import { mergeRelations } from './merge-relations.js';
import * as countries from './tables/countries.js';
import * as products from './tables/products.js';
import * as salesOrders from './tables/sales-orders.js';
import * as salesOrderTypes from './tables/sales-order-types.js';

const authTables = { ...auth };
const { customerRelations, ...customerTables } = customers;
const { activityRelations, ...activityTables } = activities;
const { countryRelations, ...countryTables } = countries;
const { productRelations, ...productTables } = products;
const { salesOrderRelations, salesOrderItemRelations, ...salesOrderTables } = salesOrders;
const { salesOrderTypeRelations, ...salesOrderTypeTables } = salesOrderTypes;

export const schema = { ...authTables, ...customerTables, ...activityTables, ...countryTables, ...productTables, ...salesOrderTables, ...salesOrderTypeTables };

// Tables plus the relations defined next to them.
export const relations = mergeRelations(
  defineRelations(schema),
  customerRelations,
  activityRelations,
  countryRelations,
  productRelations,
  salesOrderRelations,
  salesOrderItemRelations,
  salesOrderTypeRelations,
);

export type Database = import('drizzle-orm/node-postgres').NodePgDatabase<typeof relations>;

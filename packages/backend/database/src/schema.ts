import { defineRelations } from 'drizzle-orm';
// tables/auth.ts re-exports the users' table of dafne_auth (@dafne/backend-database-auth).
import * as auth from './tables/auth.js';
import * as customers from './tables/customers.js';
import * as activities from './tables/activities.js';
import { mergeRelations } from './merge-relations.js';
import * as countries from './tables/countries.js';
import * as products from './tables/products.js';

const authTables = { ...auth };
const { customerRelations, ...customerTables } = customers;
const { activityRelations, ...activityTables } = activities;
const { countryRelations, ...countryTables } = countries;
const { productRelations, ...productTables } = products;

export const schema = { ...authTables, ...customerTables, ...activityTables, ...countryTables, ...productTables };

// Tables plus the relations defined next to them.
export const relations = mergeRelations(
  defineRelations(schema),
  customerRelations,
  activityRelations,
  countryRelations,
  productRelations,
);

export type Database = import('drizzle-orm/mysql2').MySql2Database<typeof relations>;

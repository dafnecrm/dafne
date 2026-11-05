import { defineRelations } from 'drizzle-orm';
// auth.ts re-exports the users' table of the auth schema (@dafne/backend-database-auth).
import * as auth from './auth.js';
import * as customers from './tables/customers.js';

const { authRelations, ...authTables } = auth;
const { customerRelations, ...customerTables } = customers;

export const schema = { ...authTables, ...customerTables };

// Tables plus the relations defined next to them.
export const relations = {
  ...defineRelations(schema),
  ...authRelations,
  ...customerRelations,
};

export type Database = import('drizzle-orm/node-postgres').NodePgDatabase<typeof relations>;

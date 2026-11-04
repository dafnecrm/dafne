import { defineConfig } from 'drizzle-kit';

// dafne_auth: the kit tables (plain mysqlTable: drizzle-kit ignores tables in
// a mysqlSchema; see src/qualify.ts) and their migrations. Generate with
// `pnpm dafne db generate @dafne/backend-database-auth`.
export default defineConfig({
  out: './migrations',
  schema: ['./src/kit'],
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'mysql://localhost/dafne_auth' },
  migrations: { table: '_migrations' },
});

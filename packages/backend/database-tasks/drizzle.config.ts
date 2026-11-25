import { defineConfig } from 'drizzle-kit';

// The tables of the tasks schema and their migrations. Generate with
// `pnpm dafne db generate` (drizzle-kit, see @dafne/backend-migrator); apply
// with `pnpm dafne db migrate`. The users' table stays out: src/tables
// imports it from @dafne/backend-database-auth without exporting it.
export default defineConfig({
  out: './migrations',
  schema: ['./src/tables'],
  dialect: 'postgresql',
  schemaFilter: ['tasks'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost/dafne' },
});

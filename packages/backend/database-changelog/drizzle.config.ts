import { defineConfig } from 'drizzle-kit';

// The changelog schema's migrations are all written by hand: drizzle-kit
// can't create a partitioned table (PARTITION BY LIST), so it doesn't see
// the table (src/change.ts is only for queries) and this package's
// migrations are always `--custom`:
// `pnpm dafne db generate @dafne/backend-database-changelog --custom --name x`.
export default defineConfig({
  out: './migrations',
  schema: ['./src/drizzle-kit.ts'],
  dialect: 'postgresql',
  schemaFilter: ['changelog'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost/dafne' },
});

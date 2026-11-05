import { defineConfig } from 'drizzle-kit';

// The tables of the sales schema and their migrations. Generate with
// `pnpm dafne db generate` (drizzle-kit, see @dafne/backend-migrator); apply
// with `pnpm dafne db migrate`. Generating doesn't connect to the database.
// The users' table (src/auth.ts) stays out: it's not in tables/.
export default defineConfig({
  out: './migrations',
  schema: ['./src/tables'],
  dialect: 'postgresql',
  schemaFilter: ['sales'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost/dafne' },
});

import { defineConfig } from 'drizzle-kit';

// The auth schema and its migrations. Generate with
// `pnpm dafne db generate @dafne/backend-database-auth`.
export default defineConfig({
  out: './migrations',
  schema: ['./src/auth-db.ts', './src/better-auth.ts', './src/app-access.ts'],
  dialect: 'postgresql',
  schemaFilter: ['auth'],
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgres://localhost/dafne' },
});

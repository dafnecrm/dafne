import { defineConfig } from 'drizzle-kit';

// The tables of dafne_sales and their migrations. Generate with
// `pnpm nx run @dafne/backend-database:migration:generate` (drizzle-kit +
// the foreign key fixes, see @dafne/backend-migrator); apply with
// `pnpm dafne db migrate`. Generating doesn't connect to the database.
export default defineConfig({
  out: './migrations',
  schema: ['./src/tables'],
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'mysql://localhost/dafne_sales' },
  migrations: { table: '_migrations' },
});

import { defineConfig } from 'drizzle-kit';

// Migrazioni di reporting.db per le tabelle (lib/db/tables) e le viste (lib/db/views); schema.ts le riesporta per le query delle pagine.
export default defineConfig({
  out: './libs/database/src/migrations',
  schema: ['./libs/database/src/tables'],
  dialect: 'mysql',
});

import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit migrate connects with the API's DATABASE_URL (.env, as
// ConfigModule reads it) unless it's already in the environment.
const ENV_FILE = '.env';
if (!process.env.DATABASE_URL && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

// Migrations of the tables in @dafne/backend-database. DatabaseModule also
// applies them when the backend starts: same folder, same migrations table.
export default defineConfig({
  out: './migrations',
  schema: ['../../packages/backend/database/src/tables'],
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  migrations: { table: '_migrations' },
});

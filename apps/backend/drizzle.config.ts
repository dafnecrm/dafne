import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit migrate connects with the API's DATABASE_URL (apps/api/.env,
// as ConfigModule reads it) unless it's already in the environment.
const ENV_FILE = 'apps/api/.env';
if (!process.env.DATABASE_URL && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

// Migrations of the tables in libs/database/src/tables. DatabaseModule also
// applies them when the backend starts: same folder, same migrations table.
export default defineConfig({
  out: './libs/database/src/migrations',
  schema: ['./libs/database/src/tables'],
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  migrations: { table: '_migrations' },
});

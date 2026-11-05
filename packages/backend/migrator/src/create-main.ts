#!/usr/bin/env node
/*
 * Creates the Dafne database and its owner: `pnpm dafne db create` (or
 * `pnpm nx run @dafne/backend-migrator:create-database`). Database, role
 * and password come from MIGRATIONS_DATABASE_URL; the superuser that
 * creates them from ADMIN_DATABASE_URL (or --admin-url). Both from the
 * environment, else this package's .env.
 *
 * --icu-locale <locale>  the database's ICU locale (default und)
 * --locale <locale>      LC_COLLATE / LC_CTYPE (default C.UTF-8)
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createDatabase } from './create.ts';

const ENV_FILE = join(import.meta.dirname, '..', '.env');
if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const { values } = parseArgs({
  options: {
    'admin-url': { type: 'string' },
    'icu-locale': { type: 'string' },
    locale: { type: 'string' },
  },
});

const url = process.env.MIGRATIONS_DATABASE_URL;
const adminUrl = values['admin-url'] ?? process.env.ADMIN_DATABASE_URL;
if (!url || !adminUrl) {
  console.error(
    [
      !url &&
        'MIGRATIONS_DATABASE_URL is not set (e.g. postgres://dafne:secret@localhost:5432/dafne): the database and role to create.',
      !adminUrl &&
        'ADMIN_DATABASE_URL is not set (e.g. postgres://postgres:secret@localhost:5432/postgres): a superuser that creates them.',
      'Set them in the environment or in packages/backend/migrator/.env.',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  process.exit(1);
}

try {
  await createDatabase({
    adminUrl,
    url,
    icuLocale: values['icu-locale'],
    locale: values.locale,
    log: (line) => console.log(line),
  });
  console.log('Next: pnpm dafne db migrate');
} catch (error) {
  console.error(`Couldn't create the database: ${(error as Error).message}`);
  process.exit(1);
}

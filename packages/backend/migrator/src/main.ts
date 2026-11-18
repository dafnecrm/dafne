#!/usr/bin/env node
/*
 * Applies the migrations of every schema of the Dafne database: `pnpm dafne db migrate`
 * (or `pnpm nx run @dafne/backend-migrator:migrate`). The server comes from
 * MIGRATIONS_DATABASE_URL (environment, else this package's .env), with a
 * user that can create and alter its schemas: the apps' own users don't
 * need those rights.
 *
 * --optional (the `migrate:dev` target, run before `dafne dev`): without a
 * server configured it warns and exits, instead of failing.
 * --create (`migrate:dev` too): when the database or its owner is missing
 * (a new server, e.g. the one of compose.yaml), creates them first as
 * `pnpm dafne db create` does, with ADMIN_DATABASE_URL.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { migrate } from './apply.ts';
import { ensureDatabase } from './create.ts';
import { databasePackages, findWorkspaceRoot } from './workspace.ts';

const ENV_FILE = join(import.meta.dirname, '..', '.env');
// What the environment sets already wins over the file.
if (existsSync(ENV_FILE)) {
  process.loadEnvFile(ENV_FILE);
}

const url = process.env.MIGRATIONS_DATABASE_URL;
if (!url && process.argv.includes('--optional')) {
  console.warn(
    'Migrations skipped: MIGRATIONS_DATABASE_URL is not set (packages/backend/migrator/.env).',
  );
  process.exit(0);
}
if (!url) {
  console.error(
    'MIGRATIONS_DATABASE_URL is not set (e.g. postgres://dafne:secret@localhost:5432/dafne). ' +
      'Set it in the environment or in packages/backend/migrator/.env.',
  );
  process.exit(1);
}

const adminUrl = process.env.ADMIN_DATABASE_URL;
if (process.argv.includes('--create') && adminUrl) {
  const created = await ensureDatabase({
    adminUrl,
    url,
    log: (line) => console.log(line),
  });
  if (created) {
    console.log('The database was missing: created.');
  }
}

const packages = databasePackages(findWorkspaceRoot(import.meta.dirname));
console.log(
  `Schemas: ${packages.map((p) => `${p.schema} (${p.name})`).join(', ')}`,
);
const applied = await migrate({
  url,
  packages,
  log: (line) => console.log(`  applied ${line}`),
});
console.log(
  applied.length
    ? `${applied.length} migrations applied.`
    : 'Nothing to apply.',
);

#!/usr/bin/env node
/*
 * `migration:generate` of a database package (run from its folder):
 * drizzle-kit generate with the package's drizzle.config.ts, then its
 * foreign keys are fixed: the ON DELETE/UPDATE drizzle-kit drops, and the
 * database of tables owned by another package (see qualifyForeignKeys). Extra arguments go to drizzle-kit (--name, --custom).
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  migrationFolders,
  qualifyForeignKeys,
  readSnapshot,
  snapshotForeignKeys,
  snapshotTables,
  tableOwners,
} from './foreign-keys.ts';
import { databasePackages, findWorkspaceRoot } from './workspace.ts';

const cwd = resolve(process.cwd());
const packages = databasePackages(findWorkspaceRoot(cwd));
const pkg = packages.find((p) => p.dir === cwd);
if (!pkg) {
  console.error(`${cwd} isn't a database package ("dafne": { "database": … } in package.json).`);
  process.exit(1);
}

const before = new Set(migrationFolders(pkg));
// drizzle-kit doesn't export its bin: the one pnpm links in this package.
const kit = join(import.meta.dirname, '..', 'node_modules', '.bin', 'drizzle-kit');
// Inherit the terminal: drizzle-kit may ask whether a column was renamed.
const result = spawnSync(kit, ['generate', ...process.argv.slice(2)], { stdio: 'inherit', cwd });
if (result.status !== 0) process.exit(result.status ?? 1);

const others = tableOwners(packages.filter((p) => p !== pkg));
for (const folder of migrationFolders(pkg).filter((f) => !before.has(f))) {
  const dir = join(pkg.migrations, folder);
  const snapshot = readSnapshot(dir);
  const own = new Set(snapshotTables(snapshot));
  const file = join(dir, 'migration.sql');
  const sql = readFileSync(file, 'utf8');
  const fixed = qualifyForeignKeys(sql, snapshotForeignKeys(snapshot), (table) =>
    own.has(table) ? undefined : others.get(table),
  );
  if (fixed !== sql) {
    writeFileSync(file, fixed);
    console.log(`Fixed the foreign keys (ON DELETE/UPDATE, other databases) in ${folder}/migration.sql.`);
  }
}

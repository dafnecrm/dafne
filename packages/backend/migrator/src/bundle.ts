import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { databasePackages, findWorkspaceRoot, type DatabasePackage } from './workspace.ts';

/*
 * The migrations an app carries in its build, so it can apply them when it
 * starts (see start.ts): `dist/migrations/<database>/<folder>/migration.sql`.
 * Every database's, not just the app's own: they run in one order across
 * databases (e.g. dafne_auth's first migration moves tables out of
 * dafne_sales), so any app can bring a fresh server up to date.
 */

/** Folder of the migrations in an app's build, next to main.js. */
export const BUNDLED_MIGRATIONS = 'migrations';

/**
 * CopyRspackPlugin patterns that copy the migrations of every database
 * package into the build (only `migration.sql`: the snapshots are for
 * drizzle-kit). For an app's rspack.config.js:
 * `new rspack.CopyRspackPlugin({ patterns: migrationCopyPatterns(import.meta.dirname) })`.
 */
export function migrationCopyPatterns(from: string) {
  return databasePackages(findWorkspaceRoot(from))
    .filter((pkg) => existsSync(pkg.migrations))
    .map((pkg) => ({
      from: '*/migration.sql',
      context: pkg.migrations,
      to: `${BUNDLED_MIGRATIONS}/${pkg.database}`,
    }));
}

/** The databases of a build's migrations folder: one subfolder each. */
export function bundledPackages(dir: string): DatabasePackage[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      dir,
      database: entry.name,
      migrations: join(dir, entry.name),
    }))
    .sort((a, b) => a.database.localeCompare(b.database));
}

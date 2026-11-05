import { existsSync } from 'node:fs';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { DatabasePackage } from './workspace.ts';

/** One migration of one database. */
export interface Migration {
  database: string;
  /** Folder name, `<yyyyMMddHHmmss>_<name>`: what's recorded as applied. */
  name: string;
  /** The folder's timestamp. */
  folderMillis: number;
  hash: string;
  /** Statements (split on `--> statement-breakpoint`). */
  sql: string[];
}

/** The migrations of a database package, as drizzle reads them. */
export function readMigrations(pkg: DatabasePackage): Migration[] {
  if (!existsSync(pkg.migrations)) return [];
  return readMigrationFiles({ migrationsFolder: pkg.migrations }).map((m) => ({
    database: pkg.database,
    name: m.name!,
    folderMillis: m.folderMillis,
    hash: m.hash,
    sql: m.sql,
  }));
}

/**
 * The migrations to apply, in one order across databases: by timestamp,
 * then name, then database. So a fresh server replays the history as it
 * happened (e.g. a table created in dafne_sales, later moved to dafne_core
 * with RENAME TABLE).
 */
export function pendingMigrations(
  migrations: Migration[],
  applied: ReadonlyMap<string, ReadonlySet<string>>,
): Migration[] {
  return migrations
    .filter((m) => !applied.get(m.database)?.has(m.name))
    .sort(
      (a, b) =>
        a.folderMillis - b.folderMillis ||
        a.name.localeCompare(b.name) ||
        a.database.localeCompare(b.database),
    );
}

/** A statement that's only comments or blank: MySQL rejects an empty query. */
export function isEmptyStatement(statement: string): boolean {
  return statement
    .split('\n')
    .every((line) => !line.trim() || line.trim().startsWith('--'));
}

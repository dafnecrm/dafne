import { existsSync } from 'node:fs';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import type { DatabasePackage } from './workspace.ts';

/** One migration of one schema. */
export interface Migration {
  schema: string;
  /** Folder name, `<yyyyMMddHHmmss>_<name>`: what's recorded as applied. */
  name: string;
  /** The folder's timestamp. */
  folderMillis: number;
  hash: string;
  /** Statements (split on `--> statement-breakpoint`). */
  sql: string[];
}

/** The migrations of a schema package, as drizzle reads them. */
export function readMigrations(pkg: DatabasePackage): Migration[] {
  if (!existsSync(pkg.migrations)) return [];
  return readMigrationFiles({ migrationsFolder: pkg.migrations }).map((m) => ({
    schema: pkg.schema,
    name: m.name!,
    folderMillis: m.folderMillis,
    hash: m.hash,
    sql: m.sql,
  }));
}

/**
 * The migrations to apply, in one order across schemas: by timestamp,
 * then name, then schema. So a fresh database replays the history as it
 * happened (e.g. a table created in sales, later moved to core with
 * `ALTER TABLE … SET SCHEMA`).
 */
export function pendingMigrations(
  migrations: Migration[],
  applied: ReadonlyMap<string, ReadonlySet<string>>,
): Migration[] {
  return migrations
    .filter((m) => !applied.get(m.schema)?.has(m.name))
    .sort(
      (a, b) =>
        a.folderMillis - b.folderMillis ||
        a.name.localeCompare(b.name) ||
        a.schema.localeCompare(b.schema),
    );
}

/** A statement that's only comments or blank: nothing to send. */
export function isEmptyStatement(statement: string): boolean {
  return statement
    .split('\n')
    .every((line) => !line.trim() || line.trim().startsWith('--'));
}

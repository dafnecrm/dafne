import pg from 'pg';
import {
  isEmptyStatement,
  pendingMigrations,
  readMigrations,
  type Migration,
} from './plan.ts';
import type { DatabasePackage } from './workspace.ts';

/**
 * The history of every schema, in `public`: a schema's first migration
 * creates it (drizzle-kit writes `CREATE SCHEMA`), so its history can't
 * live inside it.
 */
const MIGRATIONS_TABLE = 'public._migrations';
/** pg_advisory_lock key: one run at a time. */
const LOCK = "hashtext('dafne_migrations')";
const LOCK_TIMEOUT = '300s';

const id = (name: string) => `"${name.replaceAll('"', '""')}"`;

export interface MigrateOptions {
  /** The Postgres database URL, with a user that can create and alter its schemas. */
  url: string;
  packages: DatabasePackage[];
  log?: (line: string) => void;
}

/**
 * Applies the pending migrations of every schema, in one order (see
 * pendingMigrations), each in a transaction with its record in
 * `public._migrations`: a failing migration leaves nothing behind. One
 * run at a time (pg_advisory_lock). Returns what it applied.
 */
export async function migrate({
  url,
  packages,
  log = () => {},
}: MigrateOptions): Promise<Migration[]> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(`SET lock_timeout = '${LOCK_TIMEOUT}'`);
    try {
      await client.query(`SELECT pg_advisory_lock(${LOCK})`);
    } catch (error) {
      throw new Error('Another migration is running (lock dafne_migrations).', {
        cause: error,
      });
    }
    await client.query('RESET lock_timeout');

    await client.query(
      `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id serial PRIMARY KEY,
        schema text NOT NULL,
        name text NOT NULL,
        hash text NOT NULL,
        created_at bigint,
        applied_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (schema, name)
      )`,
    );
    const { rows } = await client.query<{ schema: string; name: string }>(
      `SELECT schema, name FROM ${MIGRATIONS_TABLE}`,
    );
    const applied = new Map<string, Set<string>>();
    for (const { schema, name } of rows) {
      if (!applied.has(schema)) applied.set(schema, new Set());
      applied.get(schema)!.add(name);
    }

    const pending = pendingMigrations(
      packages.flatMap(readMigrations),
      applied,
    );
    for (const migration of pending) {
      await client.query('BEGIN');
      try {
        // Unqualified names in a migration are its own schema's.
        await client.query(`SET LOCAL search_path TO ${id(migration.schema)}`);
        for (const statement of migration.sql) {
          if (isEmptyStatement(statement)) continue;
          await client.query(statement);
        }
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (schema, name, hash, created_at) VALUES ($1, $2, $3, $4)`,
          [
            migration.schema,
            migration.name,
            migration.hash,
            migration.folderMillis,
          ],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(
          `${migration.schema}/${migration.name} failed: ${(error as Error).message}`,
          { cause: error },
        );
      }
      log(`${migration.schema}  ${migration.name}`);
    }
    return pending;
  } finally {
    await client.query(`SELECT pg_advisory_unlock(${LOCK})`).catch(() => {});
    await client.end();
  }
}

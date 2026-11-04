import mysql from 'mysql2/promise';
import { isEmptyStatement, pendingMigrations, readMigrations, type Migration } from './plan.ts';
import type { DatabasePackage } from './workspace.ts';

/** Same table and columns as drizzle's migrator, so its history stays valid. */
const MIGRATIONS_TABLE = '_migrations';
const LOCK = 'dafne_migrations';
const LOCK_TIMEOUT_SECONDS = 300;

const id = (name: string) => `\`${name.replaceAll('`', '``')}\``;

export interface MigrateOptions {
  /** A MySQL server URL, with a user that can create and alter the dafne_* databases. */
  url: string;
  packages: DatabasePackage[];
  log?: (line: string) => void;
}

/**
 * Applies the pending migrations of every database, in one order (see
 * pendingMigrations), each recorded in its database's `_migrations`.
 * Creates the databases that don't exist yet. One run at a time
 * (GET_LOCK). Returns what it applied.
 */
export async function migrate({ url, packages, log = () => {} }: MigrateOptions): Promise<Migration[]> {
  const conn = await mysql.createConnection({ uri: url, multipleStatements: false });
  try {
    const [[lock]] = await conn.query<mysql.RowDataPacket[]>('SELECT GET_LOCK(?, ?) AS acquired', [
      LOCK,
      LOCK_TIMEOUT_SECONDS,
    ]);
    if (lock?.acquired !== 1) throw new Error('Another migration is running (lock dafne_migrations).');

    const applied = new Map<string, Set<string>>();
    for (const { database } of packages) {
      await conn.query(`CREATE DATABASE IF NOT EXISTS ${id(database)}`);
      await conn.query(
        `CREATE TABLE IF NOT EXISTS ${id(database)}.${id(MIGRATIONS_TABLE)} (
          id SERIAL PRIMARY KEY,
          hash TEXT NOT NULL,
          created_at BIGINT,
          name TEXT,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
      );
      const [rows] = await conn.query<mysql.RowDataPacket[]>(
        `SELECT name FROM ${id(database)}.${id(MIGRATIONS_TABLE)}`,
      );
      applied.set(database, new Set(rows.map((row) => row.name as string)));
    }

    const pending = pendingMigrations(packages.flatMap(readMigrations), applied);
    for (const migration of pending) {
      // Unqualified names in a migration are its own database's.
      await conn.query(`USE ${id(migration.database)}`);
      for (const statement of migration.sql) {
        if (isEmptyStatement(statement)) continue;
        await conn.query(statement);
      }
      await conn.query(`INSERT INTO ${id(MIGRATIONS_TABLE)} (hash, created_at, name) VALUES (?, ?, ?)`, [
        migration.hash,
        migration.folderMillis,
        migration.name,
      ]);
      log(`${migration.database}  ${migration.name}`);
    }
    return pending;
  } finally {
    await conn.query('SELECT RELEASE_LOCK(?)', [LOCK]).catch(() => {});
    await conn.end();
  }
}

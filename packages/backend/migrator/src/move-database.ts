#!/usr/bin/env node
/*
 * Moves every table of a database into another one on the same server,
 * in one atomic RENAME TABLE: rows, indexes and foreign keys move with
 * them (MySQL updates the keys that point to them). For the one-time move
 * of the old `dafne` database to `dafne_crm`:
 *
 *   pnpm --filter @dafne/backend-migrator move-database dafne dafne_crm
 *
 * Its `_migrations` table moves too, so the history stays applied. Uses
 * MIGRATIONS_DATABASE_URL (environment or this package's .env). Fails if
 * the target already has tables.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import mysql from 'mysql2/promise';

const ENV_FILE = join(import.meta.dirname, '..', '.env');
if (!process.env.MIGRATIONS_DATABASE_URL && existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);

const [from, to] = process.argv.slice(2);
const url = process.env.MIGRATIONS_DATABASE_URL;
if (!from || !to || !url) {
  console.error('Usage: move-database <from> <to>, with MIGRATIONS_DATABASE_URL set.');
  process.exit(1);
}

const id = (name: string) => `\`${name.replaceAll('`', '``')}\``;
const conn = await mysql.createConnection({ uri: url });
try {
  const tables = async (db: string) =>
    (
      await conn.query<mysql.RowDataPacket[]>(
        "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
        [db],
      )
    )[0].map((row) => row.name as string);

  const source = await tables(from);
  if (!source.length) throw new Error(`${from} has no tables.`);
  if ((await tables(to)).length) throw new Error(`${to} already has tables: nothing moved.`);

  await conn.query(`CREATE DATABASE IF NOT EXISTS ${id(to)}`);
  await conn.query(`RENAME TABLE ${source.map((t) => `${id(from)}.${id(t)} TO ${id(to)}.${id(t)}`).join(', ')}`);
  console.log(`Moved ${source.length} tables from ${from} to ${to}: ${source.join(', ')}.`);
  console.log(`Now point DATABASE_URL at ${to}. ${from} is empty: drop it when you're sure.`);
} finally {
  await conn.end();
}

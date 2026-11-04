import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { migrate } from './apply.ts';
import type { DatabasePackage } from './workspace.ts';

/*
 * Against a real MySQL server: MIGRATOR_TEST_URL=mysql://root:…@127.0.0.1:3307
 * (a throwaway server: it creates and drops dafne_mtest_* databases).
 */
const url = process.env.MIGRATOR_TEST_URL;

describe.skipIf(!url)('migrate (MySQL)', () => {
  const dbs = ['dafne_mtest_crm', 'dafne_mtest_auth'];
  let root: string;
  let packages: DatabasePackage[];

  const migration = (pkg: DatabasePackage, name: string, sql: string) => {
    mkdirSync(join(pkg.migrations, name), { recursive: true });
    writeFileSync(join(pkg.migrations, name, 'migration.sql'), sql);
  };
  const query = async (sql: string) => {
    const conn = await mysql.createConnection({ uri: url });
    try {
      return (await conn.query<mysql.RowDataPacket[]>(sql))[0];
    } finally {
      await conn.end();
    }
  };

  beforeEach(async () => {
    for (const db of dbs) await query(`DROP DATABASE IF EXISTS ${db}`);
    root = mkdtempSync(join(tmpdir(), 'dafne-migrator-'));
    packages = dbs.map((database) => ({
      name: database,
      dir: join(root, database),
      database,
      migrations: join(root, database, 'migrations'),
    }));
    const [crm, auth] = packages;
    migration(
      crm,
      '20260101000000_init',
      'CREATE TABLE `user` (`id` varchar(36) PRIMARY KEY);\n--> statement-breakpoint\nCREATE TABLE `note` (`id` varchar(36) PRIMARY KEY, `created_by_id` varchar(36), CONSTRAINT `note_fk` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL);',
    );
    migration(crm, '20260201000000_move-users', '-- `user` moved to dafne_mtest_auth\n');
    migration(auth, '20260201000001_move-users', 'RENAME TABLE `dafne_mtest_crm`.`user` TO `dafne_mtest_auth`.`user`;');
  });
  afterEach(async () => {
    rmSync(root, { recursive: true, force: true });
    for (const db of dbs) await query(`DROP DATABASE IF EXISTS ${db}`);
  });

  it('replays the history across databases, once', async () => {
    const applied = await migrate({ url: url!, packages });
    expect(applied.map((m) => `${m.database}/${m.name}`)).toEqual([
      'dafne_mtest_crm/20260101000000_init',
      'dafne_mtest_crm/20260201000000_move-users',
      'dafne_mtest_auth/20260201000001_move-users',
    ]);
    const [fk] = await query(
      "SELECT REFERENCED_TABLE_SCHEMA AS db FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'note_fk'",
    );
    expect(fk.db).toBe('dafne_mtest_auth');
    expect(await migrate({ url: url!, packages })).toEqual([]);
  });
});

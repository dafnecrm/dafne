import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { migrate } from './apply.ts';
import type { DatabasePackage } from './workspace.ts';

/*
 * Against a real Postgres: MIGRATOR_TEST_URL=postgres://postgres:…@127.0.0.1:5433/mtest
 * (a throwaway database: it creates and drops the mtest_* schemas and
 * public._migrations).
 */
const url = process.env.MIGRATOR_TEST_URL;

describe.skipIf(!url)('migrate (Postgres)', () => {
  const schemas = ['mtest_sales', 'mtest_core'];
  let root: string;
  let packages: DatabasePackage[];

  const migration = (pkg: DatabasePackage, name: string, sql: string) => {
    mkdirSync(join(pkg.migrations, name), { recursive: true });
    writeFileSync(join(pkg.migrations, name, 'migration.sql'), sql);
  };
  const query = async (sql: string) => {
    const client = new pg.Client({ connectionString: url });
    await client.connect();
    try {
      return (await client.query(sql)).rows;
    } finally {
      await client.end();
    }
  };
  const reset = async () => {
    for (const schema of schemas) {
      await query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
    await query('DROP TABLE IF EXISTS public._migrations');
  };

  beforeEach(async () => {
    await reset();
    root = mkdtempSync(join(tmpdir(), 'dafne-migrator-'));
    packages = schemas.map((schema) => ({
      name: schema,
      dir: join(root, schema),
      schema,
      migrations: join(root, schema, 'migrations'),
    }));
    const [sales, core] = packages;
    migration(
      sales,
      '20260101000000_init',
      'CREATE SCHEMA "mtest_sales";\n--> statement-breakpoint\nCREATE TABLE "mtest_sales"."customer" ("id" varchar(36) PRIMARY KEY);\n--> statement-breakpoint\nCREATE TABLE "mtest_sales"."note" ("id" varchar(36) PRIMARY KEY, "customer_id" varchar(36) CONSTRAINT "note_fk" REFERENCES "mtest_sales"."customer"("id") ON DELETE SET NULL);',
    );
    migration(
      sales,
      '20260201000000_move-customers',
      '-- customer moved to mtest_core\n',
    );
    migration(
      core,
      '20260201000001_move-customers',
      'CREATE SCHEMA "mtest_core";\n--> statement-breakpoint\nALTER TABLE "mtest_sales"."customer" SET SCHEMA "mtest_core";',
    );
  });
  afterEach(async () => {
    rmSync(root, { recursive: true, force: true });
    await reset();
  });

  it('replays the history across schemas, once', async () => {
    const applied = await migrate({ url: url!, packages });
    expect(applied.map((m) => `${m.schema}/${m.name}`)).toEqual([
      'mtest_sales/20260101000000_init',
      'mtest_sales/20260201000000_move-customers',
      'mtest_core/20260201000001_move-customers',
    ]);
    const [fk] = await query(
      "SELECT confrelid::regclass::text AS target FROM pg_constraint WHERE conname = 'note_fk'",
    );
    expect(fk.target).toBe('mtest_core.customer');
    expect(await migrate({ url: url!, packages })).toEqual([]);
  });

  it('rolls back a failing migration', async () => {
    migration(
      packages[0],
      '20260301000000_broken',
      'CREATE TABLE "mtest_sales"."x" ("id" int);\n--> statement-breakpoint\nSELECT nope;',
    );
    await expect(migrate({ url: url!, packages })).rejects.toThrow(
      'mtest_sales/20260301000000_broken failed',
    );
    expect(await query("SELECT to_regclass('mtest_sales.x') AS t")).toEqual([
      { t: null },
    ]);
    const names = await query(
      'SELECT name FROM public._migrations ORDER BY id',
    );
    expect(names.map((r) => r.name)).toEqual([
      '20260101000000_init',
      '20260201000000_move-customers',
      '20260201000001_move-customers',
    ]);
  });
});

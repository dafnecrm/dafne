import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bundledPackages, migrationCopyPatterns } from './bundle.ts';
import { migrateOnStart } from './start.ts';

describe('migrationCopyPatterns', () => {
  it('copies the migration.sql of every schema package', () => {
    const root = mkdtempSync(join(tmpdir(), 'dafne-bundle-'));
    writeFileSync(join(root, 'pnpm-workspace.yaml'), '');
    for (const [folder, schema] of [
      ['database', 'sales'],
      ['database-auth', 'auth'],
    ]) {
      mkdirSync(join(root, 'packages/backend', folder, 'migrations'), {
        recursive: true,
      });
      writeFileSync(
        join(root, 'packages/backend', folder, 'package.json'),
        JSON.stringify({ name: `@dafne/backend-${folder}`, dafne: { schema } }),
      );
    }
    mkdirSync(join(root, 'packages/backend/customers'));
    writeFileSync(
      join(root, 'packages/backend/customers/package.json'),
      '{"name":"@dafne/backend-customers"}',
    );

    expect(migrationCopyPatterns(join(root, 'apps/sales-api'))).toEqual([
      {
        from: '*/migration.sql',
        context: join(root, 'packages/backend/database-auth/migrations'),
        to: 'migrations/auth',
      },
      {
        from: '*/migration.sql',
        context: join(root, 'packages/backend/database/migrations'),
        to: 'migrations/sales',
      },
    ]);
  });
});

describe('bundledPackages', () => {
  it('reads one schema per subfolder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dafne-bundle-'));
    mkdirSync(join(dir, 'sales'));
    mkdirSync(join(dir, 'auth'));
    expect(bundledPackages(dir).map((p) => [p.schema, p.migrations])).toEqual([
      ['auth', join(dir, 'auth')],
      ['sales', join(dir, 'sales')],
    ]);
  });
});

describe('migrateOnStart', () => {
  it('does nothing without MIGRATE_ON_START=true', async () => {
    expect(await migrateOnStart({ migrations: '/nowhere', env: {} })).toEqual(
      [],
    );
    expect(
      await migrateOnStart({
        migrations: '/nowhere',
        env: { MIGRATE_ON_START: '1' },
      }),
    ).toEqual([]);
  });

  it('needs MIGRATIONS_DATABASE_URL and the bundled migrations', async () => {
    await expect(
      migrateOnStart({
        migrations: '/nowhere',
        env: { MIGRATE_ON_START: 'true' },
      }),
    ).rejects.toThrow('MIGRATIONS_DATABASE_URL');
    await expect(
      migrateOnStart({
        migrations: '/nowhere',
        env: {
          MIGRATE_ON_START: 'true',
          MIGRATIONS_DATABASE_URL: 'postgres://localhost/dafne',
        },
      }),
    ).rejects.toThrow('the build has no migrations');
  });
});

import * as p from '@clack/prompts';
import { Command } from 'commander';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot } from '../core/workspace.js';
import { fixMigration } from '../migrations/fix.js';
import { BACKEND } from '../wiring/backend.js';

interface MigrationOptions {
  root?: string;
  custom?: boolean;
  fix?: boolean;
  yes?: boolean;
}

/** The `out` folder of backend/drizzle.config.ts. */
function migrationsDir(backend: string): string {
  const config = readFileSync(join(backend, 'drizzle.config.ts'), 'utf8');
  const out = /\bout:\s*['"`]([^'"`]+)['"`]/.exec(config)?.[1] ?? './migrations';
  return join(backend, out);
}

const folders = (dir: string) =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];

/** Puts back the foreign key actions drizzle-kit drops; returns the fixes. */
function fixFolder(folder: string): string[] {
  const sqlPath = join(folder, 'migration.sql');
  const snapshotPath = join(folder, 'snapshot.json');
  if (!existsSync(sqlPath) || !existsSync(snapshotPath)) return [];
  const { sql, fixed } = fixMigration(readFileSync(sqlPath, 'utf8'), readFileSync(snapshotPath, 'utf8'));
  if (fixed.length) writeFileSync(sqlPath, sql);
  return fixed;
}

function report(folder: string, fixes: string[], relative: string) {
  const sqlPath = join(folder, 'migration.sql');
  const statements = existsSync(sqlPath)
    ? readFileSync(sqlPath, 'utf8')
        .split('--> statement-breakpoint')
        .map((s) => s.trim().split('\n')[0])
        .filter(Boolean)
    : [];
  p.note(statements.join('\n') || '(empty)', relative);
  if (fixes.length)
    p.log.info(
      `Put back the foreign key actions drizzle-kit 1.0.0-rc.5 drops in CREATE TABLE:\n${fixes.map((f) => `  ${f}`).join('\n')}`,
    );
}

/**
 * Runs drizzle-kit generate in apps/api/: a migration from the table changes,
 * or an empty one (`custom`) for SQL written by hand.
 */
async function generate(nameArg: string | undefined, options: MigrationOptions) {
  p.intro(options.custom ? 'dafne-old migration custom' : 'dafne-old migration generate');
  const root = findRoot(options.root);
  const backend = join(root, BACKEND);
  const bin = join(backend, 'node_modules', '.bin', 'drizzle-kit');
  if (!existsSync(bin)) throw new Error('drizzle-kit not found: run "pnpm install" at the root.');

  let name = nameArg?.trim();
  if (!name && !options.yes && process.stdin.isTTY) {
    const answer = await p.text({
      message: 'Migration name (empty: drizzle-kit picks one)',
      placeholder: options.custom ? 'backfill-countries' : 'add-activity-customer',
      validate: (v) => (!v || /^[\w-]+$/.test(v) ? undefined : 'Letters, digits, - and _ only'),
    });
    if (p.isCancel(answer)) return p.cancel('Nothing generated.');
    name = answer?.trim() || undefined;
  }
  if (name && !/^[\w-]+$/.test(name)) throw new Error('The name can only have letters, digits, - and _.');

  const dir = migrationsDir(backend);
  const before = new Set(folders(dir));
  const args = ['generate', ...(name ? ['--name', name] : []), ...(options.custom ? ['--custom'] : [])];
  p.log.step(`drizzle-kit ${args.join(' ')}`);
  // Inherit the terminal: drizzle-kit may ask whether a column was renamed.
  const run = spawnSync(bin, args, { cwd: backend, stdio: 'inherit' });
  if (run.status !== 0) throw new Error(`drizzle-kit failed (exit code ${run.status ?? run.signal}).`);

  const created = folders(dir).filter((f) => !before.has(f));
  if (!created.length)
    return p.outro(options.custom ? 'Nothing generated.' : 'No changes in the tables: nothing generated.');
  for (const folder of created) {
    const path = join(dir, folder);
    report(path, options.fix === false || options.custom ? [] : fixFolder(path), `${BACKEND}/${path.slice(backend.length + 1)}/migration.sql`);
  }
  p.note(
    [
      options.custom ? 'Write the SQL in migration.sql.' : 'Review migration.sql.',
      'The backend applies pending migrations when it starts (DatabaseModule).',
    ].join('\n'),
    'Next steps',
  );
  p.outro('Done.');
}

export function migrationCommand() {
  const migration = new Command('migration').description('Database migrations (drizzle-kit, in apps/api/)');

  migration
    .command('generate')
    .description('Generate a migration from the changes to the tables of @dafne/backend-database, and fix its foreign keys')
    .argument('[name]', 'migration name, e.g. add-activity-customer (asked if missing)')
    .option('--custom', 'an empty migration, for SQL written by hand')
    .option('--no-fix', "don't put back the foreign key actions drizzle-kit drops")
    .option('--root <dir>', 'Dafne folder (with apps/api/ and apps/frontend/)')
    .option('-y, --yes', 'never prompt (drizzle-kit names the migration)')
    .action((name: string | undefined, options: MigrationOptions) => generate(name, options));

  migration
    .command('custom')
    .description('Create an empty migration, for SQL written by hand (data fixes, backfills…)')
    .argument('[name]', 'migration name, e.g. backfill-countries (asked if missing)')
    .option('--root <dir>', 'Dafne folder (with apps/api/ and apps/frontend/)')
    .option('-y, --yes', 'never prompt (drizzle-kit names the migration)')
    .addHelpText(
      'after',
      `
The same as dafne-old migration generate --custom. Write the SQL in the new
migration.sql, with a --> statement-breakpoint line between statements.
The backend applies it when it starts, after the migrations before it.`,
    )
    .action((name: string | undefined, options: MigrationOptions) => generate(name, { ...options, custom: true }));

  migration
    .command('fix')
    .description('Put back the foreign key actions drizzle-kit drops, in a migration made with pnpm migration:generate')
    .argument('[folder]', 'migration folder name (default: the latest)')
    .option('--root <dir>', 'Dafne folder (with apps/api/ and apps/frontend/)')
    .action((folderArg: string | undefined, options: MigrationOptions) => {
      p.intro('dafne-old migration fix');
      const backend = join(findRoot(options.root), BACKEND);
      const dir = migrationsDir(backend);
      const all = folders(dir);
      const folder = folderArg ?? all[all.length - 1];
      if (!folder || !all.includes(folder)) throw new Error(`No migration "${folderArg ?? ''}" in ${dir}.`);
      const fixes = fixFolder(join(dir, folder));
      if (!fixes.length) return p.outro(`${folder}: nothing to fix.`);
      report(join(dir, folder), fixes, folder);
      p.log.warn('Only fix migrations that no database has applied yet: an applied one is never run again.');
      p.outro('Done.');
    });

  return migration;
}

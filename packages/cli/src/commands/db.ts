import { Command } from 'commander';
import { findWorkspaceRoot, runNx } from '../core/nx.ts';

/*
 * `dafne db …`: the databases' migrations, through the targets of
 * @dafne/backend-migrator and of the database packages
 * (`"dafne": { "database": … }` in their package.json).
 */

const MIGRATOR = '@dafne/backend-migrator';
const DEFAULT_DATABASE_PACKAGE = '@dafne/backend-database';

export function dbCommand() {
  const db = new Command('db').description('Database migrations (every dafne_* database, one order)');

  db.command('migrate')
    .description('Apply the pending migrations of every database (MIGRATIONS_DATABASE_URL)')
    .action(async () => {
      process.exitCode = await runNx(findWorkspaceRoot(), ['run', `${MIGRATOR}:migrate`]);
    });

  db.command('generate')
    .description('Generate a migration from the table changes of a database package (drizzle-kit + foreign key fixes)')
    .argument('[project]', `database package (default: ${DEFAULT_DATABASE_PACKAGE})`, DEFAULT_DATABASE_PACKAGE)
    .option('--name <name>', 'migration name, e.g. add-invoice')
    .option('--custom', 'an empty migration, for SQL written by hand')
    .action(async (project: string, options: { name?: string; custom?: boolean }) => {
      const args = ['run', `${project}:migration:generate`, '--'];
      if (options.name) args.push('--name', options.name);
      if (options.custom) args.push('--custom');
      process.exitCode = await runNx(findWorkspaceRoot(), args);
    });

  db.command('move')
    .description('One time: move every table of a database into another (e.g. dafne dafne_crm)')
    .argument('<from>')
    .argument('<to>')
    .action(async (from: string, to: string) => {
      process.exitCode = await runNx(findWorkspaceRoot(), ['run', `${MIGRATOR}:move-database`, '--', from, to]);
    });

  return db;
}

import * as p from '@clack/prompts';
import { Command } from 'commander';
import { FsTree } from 'nx/src/generators/tree.js';
import { Changes } from '../core/changes.ts';
import { resourceNames } from '../core/names.ts';
import { findWorkspaceRoot, runNx } from '../core/nx.ts';
import { listFields, listResources } from '../fields/operations.ts';
import { migrationName } from '../generators/remove-backend-db-column/generator.ts';
import { generateMigration } from './db.ts';
import { cancelled, interactive } from './field-prompts.ts';

/*
 * `dafne remove <kind> …`: removes code, through the generators of this
 * package (`nx g @dafne/cli:remove-<kind>`), asking for what's missing.
 */

interface RemoveColumnOptions {
  migration?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

/** The table: given, or picked among the tables the CLI can edit. */
async function askTable(changes: Changes, value: string | undefined, options: RemoveColumnOptions): Promise<string> {
  const tables = listResources(changes);
  if (value) {
    const name = resourceNames(value).p.kebab;
    if (!tables.includes(name)) throw new Error(`No table "${value}": pick one of ${tables.join(', ')}.`);
    return name;
  }
  if (!interactive(options)) throw new Error('Missing argument: the table (e.g. orders).');
  return cancelled<string>(
    await p.select<string>({ message: 'Table', options: tables.map((t) => ({ value: t, label: t })) }),
  );
}

/** The columns: given, or picked (several) among the table's columns and relations. */
async function askColumns(changes: Changes, table: string, values: string[], options: RemoveColumnOptions): Promise<string[]> {
  if (values.length) return values;
  if (!interactive(options)) throw new Error('Missing argument: the columns to remove (e.g. name).');
  const { columns, relations } = listFields(changes, table);
  if (!columns.length && !relations.length) throw new Error(`${table} has no column to remove.`);
  const picked = cancelled<string[]>(
    await p.multiselect<string>({
      message: `Columns of ${table} to remove (space to toggle, enter to confirm)`,
      required: true,
      options: [
        ...columns.map((c) => ({ value: c, label: c })),
        ...relations.map((r) => ({ value: r, label: r, hint: 'relation' })),
      ],
    }),
  );
  const sure = cancelled<boolean>(
    await p.confirm({ message: `Remove ${picked.join(', ')} from ${table}? Their data goes with the migration.`, initialValue: false }),
  );
  if (!sure) {
    p.cancel('Nothing removed.');
    process.exit(1);
  }
  return picked;
}

export function removeCommand() {
  const remove = new Command('remove').description('Remove code: columns of a table, with what depends on them (Nx generators of @dafne/cli)');

  remove
    .command('backend-db-column')
    .description(
      'Remove columns (or relations) from a table: the table file, then its contract, service and specs; then generate the migration',
    )
    .argument('[table]', 'the table, by resource name (e.g. orders)')
    .argument('[columns...]', 'columns or relations to remove (e.g. name customer tags)')
    .option('--migration', 'generate the migration without asking')
    .option('--no-migration', "don't generate the migration (asked when interactive, default yes)")
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt; fail when an argument is missing')
    .addHelpText(
      'after',
      `
Examples:
  dafne remove backend-db-column                       # asks for the table and the columns
  dafne remove backend-db-column orders name
  dafne remove backend-db-column orders name notes --no-migration

A foreign key takes its relations with it (customer or customerId); a
one-to-many or many-to-many relation removes the key on the other table, or
the junction table. Then: dafne sync frontend-resource <resource>.

Same as: nx g @dafne/cli:remove-backend-db-column <table> --columns=<column> ...
then: dafne db generate --name drop-<table>-<columns>`,
    )
    .action(async (tableArg: string | undefined, columnArgs: string[], options: RemoveColumnOptions, command: Command) => {
      const root = findWorkspaceRoot();
      if (interactive(options)) p.intro('dafne remove backend-db-column');
      // The prompts read the workspace as it is on disk.
      const changes = new Changes(new FsTree(root, false));
      const table = await askTable(changes, tableArg, options);
      const columns = await askColumns(changes, table, columnArgs, options);

      // --no-migration: no; otherwise asked (default yes), or yes with -y. Never on a dry run.
      let migration = options.migration !== false && !options.dryRun;
      if (migration && interactive(options) && command.getOptionValueSource('migration') !== 'cli')
        migration = cancelled<boolean>(await p.confirm({ message: 'Generate the migration?', initialValue: true }));

      const args = ['g', '@dafne/cli:remove-backend-db-column', table, ...columns.map((c) => `--columns=${c}`), '--no-interactive'];
      if (migration) args.push('--migration');
      if (options.dryRun) args.push('--dry-run');
      if (interactive(options)) p.log.step(`nx ${args.join(' ')}`);
      const code = await runNx(root, args);
      if (code !== 0 || !migration) {
        process.exitCode = code;
        return;
      }

      const name = migrationName(resourceNames(table).s.kebab, columns);
      if (interactive(options)) p.log.step(`dafne db generate --name ${name}`);
      process.exitCode = await generateMigration(root, undefined, { name });
    });

  return remove;
}

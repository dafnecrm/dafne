import * as p from '@clack/prompts';
import { Command } from 'commander';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Changes } from '../core/changes.js';
import { formatSource } from '../core/format.js';
import { resourceNames, type ResourceNames } from '../core/names.js';
import { findRoot } from '../core/workspace.js';
import { contractFile } from '../generators/backend.js';
import { syncContract, type SyncReport } from '../sync/contract.js';
import { API_TAGS, readTable } from '../sync/table.js';
import { BACKEND } from '../wiring/backend.js';

interface SyncOptions {
  root?: string;
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

const TABLES = `${BACKEND}/libs/database/src/tables`;
const tableFile = ({ p }: ResourceNames) => `${TABLES}/${p.kebab}.ts`;

/** Resources with both a table file and a contract. */
export function syncable(changes: Changes): string[] {
  return readdirSync(join(changes.root, TABLES))
    .filter((file) => file.endsWith('.ts') && file !== 'auth.ts')
    .map((file) => file.replace(/\.ts$/, ''))
    .filter((name) => {
      try {
        return changes.exists(contractFile(resourceNames(name)));
      } catch {
        return false;
      }
    });
}

export async function syncOne(changes: Changes, name: string, dropped: string[] = []): Promise<SyncReport> {
  const names = resourceNames(name);
  const tablePath = tableFile(names);
  const contractPath = contractFile(names);
  const table = changes.read(tablePath);
  if (table === undefined) throw new Error(`${tablePath} not found.`);
  if (!changes.exists(contractPath))
    throw new Error(`${contractPath} not found: create it with "dafne g backend contract ${names.p.kebab}".`);

  const info = readTable(tablePath, table, names);
  const source = changes.read(contractPath)!;
  const { content, report } = syncContract(contractPath, source, names, info, dropped);
  // Compare formatted, so a rewrite that changes only the layout is no change.
  const formatted = await formatSource(join(changes.root, contractPath), content, source);
  if (formatted !== source) changes.update(contractPath, () => formatted);
  report.warnings.unshift(...info.warnings);
  return report;
}

export function printSync(name: string, report: SyncReport, changed: boolean) {
  const lines = [
    ...report.added.map((item) => `+ ${item}`),
    ...report.removed.map((item) => `- ${item}`),
  ];
  if (!changed) p.log.success(`${name}: already in sync.`);
  else p.note(lines.join('\n') || 'Formatting only', name);
  for (const item of report.unknown)
    p.log.warn(`${item} isn't a column of the table: kept. Remove it if the column was dropped.`);
  for (const warning of report.warnings) p.log.warn(warning);
  if (report.required.length)
    p.log.warn(
      `New required body fields: ${report.required.join(', ')}. Add them to the samples in the contract spec and to the frontend form.`,
    );
}

export function syncCommand() {
  const sync = new Command('sync').description('Bring code in line with the database tables');

  sync
    .command('contract')
    .description(
      'Update libs/contracts/src/<plural>.ts from libs/database/src/tables/<plural>.ts, keeping hand-written validation',
    )
    .argument('[name]', 'resource name, singular or plural')
    .option('--all', 'every table that has a contract')
    .option('--root <dir>', 'Dafne folder (with backend/ and frontend/)')
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt')
    .addHelpText(
      'after',
      `
Columns go in the body, the responses, the filters and the sort fields by
default. Change that with a comment above the column in the table:

  /** @api internal */    used only by the backend: never in the contract
  testinternal: varchar('testinternal', { length: 10 }),

Tags: ${API_TAGS.join(', ')}.
id, createdById/updatedById, deletedAt and server-filled columns
(defaultNow, $onUpdate…) follow the customers contract.`,
    )
    .action(async (name: string | undefined, options: SyncOptions) => {
      p.intro('dafne sync contract');
      const changes = new Changes(findRoot(options.root));
      let resources: string[];
      if (options.all) resources = syncable(changes);
      else if (name) resources = [name];
      else if (!options.yes && process.stdin.isTTY) {
        const choices = syncable(changes);
        if (!choices.length) throw new Error('No table has a contract to sync.');
        const picked = await p.select({
          message: 'Which contract?',
          options: choices.map((value) => ({ value, label: value })),
        });
        if (p.isCancel(picked)) return p.cancel('Nothing changed.');
        resources = [picked];
      } else throw new Error('Missing argument: the resource name, or --all.');

      for (const resource of resources) {
        const before = changes.summary().length;
        const report = await syncOne(changes, resource);
        printSync(resource, report, changes.summary().length > before);
      }

      if (!changes.summary().length || options.dryRun) return p.outro(options.dryRun ? 'Dry run: nothing written.' : 'Done.');
      await changes.commit();
      p.note(
        [
          'The service and the frontend still use the old fields; the typecheck shows where:',
          'cd backend && npx tsc --noEmit && pnpm test',
          'cd frontend && npx tsc --noEmit',
          'Update the service (select, insert, update), the form (schema.ts, form) and the columns.',
        ].join('\n'),
        'Next steps',
      );
      p.outro('Done.');
    });

  return sync;
}

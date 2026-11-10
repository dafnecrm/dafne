import * as p from '@clack/prompts';
import { Command } from 'commander';
import { FsTree } from 'nx/src/generators/tree.js';
import { Changes } from '../core/changes.ts';
import { findFrontendTarget, frontendLibs, libName } from '../core/frontend-target.ts';
import { resourceNames } from '../core/names.ts';
import { findWorkspaceRoot, runNx } from '../core/nx.ts';
import { DEFAULT_FRONTEND_APP, frontendApp, frontendLib } from '../core/workspace.ts';
import { syncableContracts } from '../generators/contract-sync/generator.ts';
import { contractFile } from '../pieces/backend.ts';
import { API_TAGS } from '../sync/table.ts';
import { dataFiles } from '../sync/frontend.ts';
import { cancelled, interactive } from './field-prompts.ts';

/*
 * `dafne sync <kind> …`: brings code in line with what it's made from,
 * through the generators of this package (`nx g @dafne/cli:<kind>`).
 */

interface ContractSyncOptions {
  all?: boolean;
  service?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

interface FrontendSyncOptions {
  app?: string;
  lib?: string;
  keep?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

/**
 * Resources with a contract and pages: in the app (lib/<plural>.ts), or in
 * a frontend lib (<plural>-table.ts with define<Plural>Table, in src or
 * src/<plural>). With the place they're in, for the picker.
 */
function frontendResources(changes: Changes, app: string): { name: string; where: string }[] {
  const candidates = new Set(
    changes
      .list(`${frontendApp(app)}/lib`)
      .filter((file) => /^[a-z0-9-]+(-table)?\.ts$/.test(file))
      .map((file) => file.replace(/(-table)?\.ts$/, '')),
  );
  for (const lib of frontendLibs(changes)) {
    for (const entry of changes.list(`${frontendLib(lib)}/src`)) {
      const table = /^([a-z0-9-]+)-table\.ts$/.exec(entry)?.[1];
      if (table) {
        candidates.add(table);
      } else if (!changes.exists(`${frontendLib(lib)}/src/${entry}`)) {
        candidates.add(entry);
      }
    }
  }
  return [...candidates].sort().flatMap((name) => {
    const names = resourceNames(name);
    if (names.p.kebab !== name || !changes.exists(contractFile(names))) {
      return [];
    }
    const target = findFrontendTarget(changes, names, app);
    if (!target || !changes.exists(dataFiles(names, target).table)) {
      return [];
    }
    return [{ name, where: target.kind === 'app' ? frontendApp(app) : frontendLib(target.lib) }];
  });
}

export function syncCommand() {
  const sync = new Command('sync').description('Bring code in line with what it comes from (Nx generators of @dafne/cli)');

  sync
    .command('contract')
    .description(
      "Update a resource's contract (body, sort and filter fields, list query, responses) from its table, then the service's queries and the specs' samples, keeping hand-written code",
    )
    .argument('[resource]', 'resource name, singular or plural (e.g. orders)')
    .option('--all', 'every table that has a contract')
    .option('--no-service', "don't update the service's queries (list, detail, create, update) and its spec")
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt; fail when an argument is missing')
    .addHelpText(
      'after',
      `
Examples:
  dafne sync contract orders
  dafne sync contract --all --dry-run

The table is packages/backend/database/src/tables/<plural>.ts. Columns go
in the body, the responses, the filters and the sort fields by default.
Change that with a comment above the column in the table:

  /** @api internal */    used only by the backend: never in the contract
  notes: text('notes'),

Tags: ${API_TAGS.join(', ')}.
Members that aren't columns (e.g. addresses) are left alone. Then sync
the pages: dafne sync frontend-resource <resource>.

Same as: nx g @dafne/cli:contract-sync <resource> ...`,
    )
    .action(async (resourceArg: string | undefined, options: ContractSyncOptions) => {
      const root = findWorkspaceRoot();
      if (interactive(options)) {
        p.intro('dafne sync contract');
      }
      let resource = resourceArg;
      if (!resource && !options.all) {
        if (!interactive(options)) {
          throw new Error('Missing argument: the resource (e.g. orders), or --all.');
        }
        const choices = syncableContracts(new Changes(new FsTree(root, false)));
        if (!choices.length) {
          throw new Error('No table has a contract to sync.');
        }
        resource = cancelled<string>(
          await p.select<string>({ message: 'Contract', options: choices.map((value) => ({ value, label: value })) }),
        );
      }

      const args = ['g', '@dafne/cli:contract-sync', ...(resource ? [resource] : []), '--no-interactive'];
      if (options.all) {
        args.push('--all');
      }
      if (options.service === false) {
        args.push('--no-service');
      }
      if (options.dryRun) {
        args.push('--dry-run');
      }
      if (interactive(options)) {
        p.log.step(`nx ${args.join(' ')}`);
      }
      process.exitCode = await runNx(root, args);
    });

  sync
    .command('frontend-resource')
    .description(
      "Update a resource's pages (form, list, detail) from its contract: add the fields they lack, remove those the contract dropped",
    )
    .argument('[resource]', 'resource name, singular or plural (e.g. orders)')
    .option('--app <name>', `frontend app of the pages (default ${DEFAULT_FRONTEND_APP})`)
    .option('--lib <name>', 'frontend lib the resource is in (default: found by itself)')
    .option('--keep', 'only add: keep (and report) what the contract dropped')
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt; fail when an argument is missing')
    .addHelpText(
      'after',
      `
Examples:
  dafne sync frontend-resource orders
  dafne sync frontend-resource invoices --app billing-web --dry-run
  dafne sync frontend-resource sales-orders   # in packages/frontend/sales-orders

The form follows the contract's body, the list and the detail its
responses. Reads of dropped fields elsewhere (page titles, dialogs) are
listed, to fix by hand. A field that must stay off a page: mark it with
{/* dafne-ignore: <field> */}.

Same as: nx g @dafne/cli:frontend-resource-sync <resource> ...`,
    )
    .action(async (resourceArg: string | undefined, options: FrontendSyncOptions) => {
      const root = findWorkspaceRoot();
      const app = options.app ?? DEFAULT_FRONTEND_APP;
      if (interactive(options)) {
        p.intro('dafne sync frontend-resource');
      }
      let resource = resourceArg;
      if (!resource) {
        if (!interactive(options)) {
          throw new Error('Missing argument: the resource (e.g. orders).');
        }
        const choices = frontendResources(new Changes(new FsTree(root, false)), app);
        if (!choices.length) {
          throw new Error(`${frontendApp(app)} has no resource pages to sync.`);
        }
        resource = cancelled<string>(
          await p.select<string>({
            message: 'Resource',
            options: choices.map(({ name, where }) => ({ value: name, label: name, hint: where })),
          }),
        );
      }

      const args = ['g', '@dafne/cli:frontend-resource-sync', resource, '--no-interactive'];
      if (options.app) {
        args.push(`--app=${options.app}`);
      }
      if (options.lib) {
        args.push(`--lib=${libName(options.lib)}`);
      }
      if (options.keep) {
        args.push('--keep');
      }
      if (options.dryRun) {
        args.push('--dry-run');
      }
      if (interactive(options)) {
        p.log.step(`nx ${args.join(' ')}`);
      }
      process.exitCode = await runNx(root, args);
    });

  return sync;
}

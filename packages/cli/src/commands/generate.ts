import * as p from '@clack/prompts';
import { Command } from 'commander';
import { FsTree } from 'nx/src/generators/tree.js';
import { Changes } from '../core/changes.ts';
import { resourceNames } from '../core/names.ts';
import { findWorkspaceRoot, runNx } from '../core/nx.ts';
import { DEFAULT_APP } from '../core/workspace.ts';
import { FIELD_SPEC_HELP, formatFieldSpec, parseFieldSpec } from '../fields/parse.ts';
import { tableFile } from '../pieces/backend.ts';
import { askNewFields, cancelled, interactive } from './field-prompts.ts';

/*
 * `dafne g <kind> [name]`: asks for what's missing, then runs the matching
 * generator of this package through `nx g @dafne/cli:<generator>`.
 */

const KINDS = {
  resource: { generator: 'backend-resource', hint: 'contract + table + lib with service and controller', placeholder: 'invoice' },
  lib: { generator: 'backend-lib', hint: 'an empty Nest lib in packages/backend', placeholder: 'reports' },
  app: { generator: 'backend-app', hint: 'a NestJS app in apps/', placeholder: 'worker' },
  contract: { generator: 'contract', hint: 'Zod schemas and response types in packages/contracts', placeholder: 'invoice' },
} as const;
type Kind = keyof typeof KINDS;

interface GenerateOptions {
  app?: string;
  field?: string[];
  port?: string;
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
}

async function askKind(value: string | undefined, options: GenerateOptions): Promise<Kind> {
  if (value) {
    if (!(value in KINDS)) throw new Error(`"${value}" isn't one of: ${Object.keys(KINDS).join(', ')}.`);
    return value as Kind;
  }
  if (!interactive(options)) throw new Error(`Missing argument: pick one of ${Object.keys(KINDS).join(', ')}.`);
  return cancelled<Kind>(
    await p.select<Kind>({
      message: 'What do you want to generate?',
      options: (Object.keys(KINDS) as Kind[]).map((key) => ({ value: key, label: key, hint: KINDS[key].hint })),
    }),
  );
}

async function askName(value: string | undefined, kind: Kind, options: GenerateOptions): Promise<string> {
  if (value) return value;
  if (!interactive(options)) throw new Error('Missing argument: the name.');
  return cancelled<string>(
    await p.text({
      message: kind === 'resource' || kind === 'contract' ? 'Resource name (singular or plural)' : 'Name',
      placeholder: KINDS[kind].placeholder,
      validate: (input) => (input?.trim() ? undefined : 'Required'),
    }),
  ).trim();
}

/** The fields of a new resource: from --field, or asked (unless -y). */
async function resourceFields(root: string, name: string, options: GenerateOptions): Promise<string[]> {
  if (options.field?.length) return options.field.map((text) => formatFieldSpec(parseFieldSpec(text)));
  if (!interactive(options)) return [];
  // The prompts read the workspace (tables, ref targets) as it is on disk.
  const changes = new Changes(new FsTree(root, false));
  if (changes.exists(tableFile(resourceNames(name)))) return [];
  const now = cancelled<boolean>(await p.confirm({ message: 'Add the fields of the table now?', initialValue: true }));
  if (!now) return [];
  return (await askNewFields(changes, name)).map(formatFieldSpec);
}

export function generateCommand() {
  return new Command('generate')
    .alias('g')
    .description('Generate a backend resource, lib, app or contract (Nx generators of @dafne/cli)')
    .argument('[kind]', Object.keys(KINDS).join(' | '))
    .argument('[name]', 'name: a resource or contract is singular or plural (invoice), a lib or app as it is')
    .option('--app <name>', `lib, resource: the backend app to register the lib in (apps/<name>)`, DEFAULT_APP)
    .option('--field <spec>', `resource: a field of the new table, repeatable: ${FIELD_SPEC_HELP}`, (value: string, previous: string[] = []) => [
      ...previous,
      value,
    ])
    .option('--port <port>', 'app: default port')
    .option('--dry-run', 'show what would change, write nothing')
    .option('--force', 'overwrite files that already exist')
    .option('-y, --yes', 'never prompt; fail when an argument is missing')
    .addHelpText(
      'after',
      `
Examples:
  dafne g resource invoice --field number:string:length=20:required:unique \\
    --field status:enum:values=draft|sent|paid:default=draft --field customer:ref:to=customers
  dafne g lib reports
  dafne g app worker --port 3002
  dafne g contract report

Same as: nx g @dafne/cli:<backend-resource|backend-lib|backend-app|contract> <name> ...`,
    )
    .action(async (kindArg: string | undefined, nameArg: string | undefined, options: GenerateOptions) => {
      const root = findWorkspaceRoot();
      if (interactive(options)) p.intro('dafne generate');
      const kind = await askKind(kindArg, options);
      const name = await askName(nameArg, kind, options);
      if (options.field?.length && kind !== 'resource') throw new Error('--field is only for a resource.');

      const args = ['g', `@dafne/cli:${KINDS[kind].generator}`, name, '--no-interactive'];
      if (kind === 'resource') for (const spec of await resourceFields(root, name, options)) args.push(`--fields=${spec}`);
      if ((kind === 'resource' || kind === 'lib') && options.app !== DEFAULT_APP) args.push(`--app=${options.app}`);
      if (kind === 'app' && options.port) args.push(`--port=${options.port}`);
      if (options.force) args.push('--force');
      if (options.dryRun) args.push('--dry-run');

      if (interactive(options)) p.log.step(`nx ${args.join(' ')}`);
      process.exitCode = await runNx(root, args);
    });
}

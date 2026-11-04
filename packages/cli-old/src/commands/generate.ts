import { resourceMessages, syncMessages } from '../wiring/messages.js';
import * as p from '@clack/prompts';
import { Command, Option } from 'commander';
import { Changes } from '../core/changes.js';
import { resourceNames } from '../core/names.js';
import { findRoot } from '../core/workspace.js';
import { addField } from '../fields/operations.js';
import type { FieldSpec } from '../fields/spec.js';
import { BACKEND_RESOURCE, backendPieces, contractFile, tableFile } from '../generators/backend.js';
import {
  FRONTEND_RESOURCE,
  frontendPieces,
  generateComponent,
  generatePage,
} from '../generators/frontend.js';
import { generatePieces, type Ctx, type ResourceOptions } from '../generators/pieces.js';
import { askNewFields, FIELD_SPEC_HELP, parseFieldSpec } from './field.js';
import { printFrontendReports, syncFrontend, syncOne } from './sync.js';

interface CommonOptions {
  root?: string;
  dryRun?: boolean;
  force?: boolean;
  skipWiring?: boolean;
  yes?: boolean;
}

interface FieldOptions {
  /** --field specs, repeatable. */
  field?: string[];
}

interface FrontendOptions {
  icon: string;
  section: string;
  admin?: boolean;
  client?: boolean;
  dir: string;
}

type Target = 'fullstack' | 'backend' | 'frontend';

const FRONTEND_EXTRA = {
  page: 'Blank page at app/[locale]/(app)/<route>/page.tsx',
  component: 'Component at components/<name>.tsx',
};

/* ---------- Prompts ---------- */

const interactive = (options: CommonOptions) => !options.yes && process.stdin.isTTY;

function cancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Nothing generated.');
    process.exit(1);
  }
  return value as T;
}

async function askName(
  value: string | undefined,
  options: CommonOptions,
  message: string,
  placeholder: string,
) {
  if (value) return value;
  if (!interactive(options)) throw new Error(`Missing argument: ${message.toLowerCase()}.`);
  return cancelled<string>(
    await p.text({
      message,
      placeholder,
      validate: (input) => (input?.trim() ? undefined : 'Required'),
    }),
  ).trim();
}

async function askChoice<T extends string>(
  value: string | undefined,
  options: CommonOptions,
  message: string,
  choices: Record<T, string>,
): Promise<T> {
  if (value) {
    if (!(value in choices))
      throw new Error(`"${value}" isn't one of: ${Object.keys(choices).join(', ')}.`);
    return value as T;
  }
  if (!interactive(options))
    throw new Error(`Missing argument: pick one of ${Object.keys(choices).join(', ')}.`);
  return cancelled<T>(
    await p.select<T>({
      message,
      options: Object.entries<string>(choices).map(([key, hint]) => ({
        value: key,
        label: key,
        hint,
      })) as p.Option<T>[],
    }),
  );
}

/* ---------- Running ---------- */

type Generated = { dependencies?: string[]; next: string[] };

/** Runs `generate` on an in-memory change set, then prints and writes it. */
async function run(
  options: CommonOptions,
  generate: (changes: Changes) => Generated | Promise<Generated>,
) {
  const root = findRoot(options.root);
  const changes = new Changes(root, {
    force: options.force,
    skipUpdates: options.skipWiring,
  });
  const { dependencies = [], next } = await generate(changes);

  const summary = changes.summary();
  if (!summary.length) {
    p.log.warn('Nothing to do: everything is already there.');
    return;
  }
  const lines = summary.map(({ path, kind }) => `${kind === 'create' ? '+' : '~'} ${path}`);
  p.note(lines.join('\n'), options.dryRun ? 'Would change (dry run)' : 'Changes');
  if (dependencies.length)
    p.log.info(`Also generated, since they were missing: ${dependencies.join(', ')}.`);
  if (changes.skipped.size)
    p.log.warn(`Not registered (--skip-wiring): ${[...changes.skipped].join(', ')}.`);
  for (const warning of changes.warnings) p.log.warn(warning);

  if (options.dryRun) return;
  await changes.commit();
  if (next.length) p.note(next.join('\n'), 'Next steps');
  p.outro('Done.');
}

function nextSteps(backend: string[], frontend: string[], withFields: boolean): string[] {
  const steps: string[] = [];
  const pages = frontend.some((piece) => piece !== 'nav');
  if (backend.includes('lib')) steps.push('pnpm install   # links the new @dafne/backend-<lib> package');
  if (backend.includes('table'))
    steps.push('dafne-old migration generate   # creates the table migration (and fixes its foreign keys)');
  if (backend.length) steps.push('npx tsc -b apps/api && pnpm --filter \"@dafne/api...\" test');
  if (pages)
    steps.push('dafne-old dev --only frontend   # also generates the PageProps types of new routes');
  if (withFields)
    steps.push('Check the new fields in the form, the list and the detail page (labels, order, defaults).');
  else if (backend.length || pages)
    steps.push('Add the real fields: dafne-old field add <resource>, then dafne-old sync frontend <resource>.');
  return steps;
}

/**
 * The pieces of a resource. `fields` go into its new table before anything
 * is written; then the contract, the service and the frontend pages are
 * synced with them, as `field add` and `sync frontend` would.
 */
export async function generateResource(
  changes: Changes,
  name: string,
  requested: { backend: string[]; frontend: string[] },
  options: ResourceOptions,
  fields: FieldSpec[] = [],
): Promise<Generated> {
  const names = resourceNames(name);
  const ctx: Ctx = { changes, names, options };
  if (fields.length && changes.exists(tableFile(names)))
    throw new Error(`${tableFile(names)} already exists: add fields with "dafne-old field add ${names.p.kebab}".`);
  const backendDeps = generatePieces(backendPieces, requested.backend, ctx);

  if (fields.length) {
    if (!changes.exists(tableFile(names)))
      throw new Error('Fields need the table: generate the resource, or the table, service or controller piece.');
    for (const spec of fields)
      for (const note of addField(changes, names.p.kebab, spec).notes)
        // The table is new: it has no rows a NOT NULL column could break.
        if (!note.includes('already has rows')) changes.warn(note);
    if (changes.exists(contractFile(names))) {
      const report = await syncOne(changes, names.p.kebab);
      for (const warning of [...report.warnings, ...report.unknown.map((key) => `contract: ${key} isn't a column.`)]) changes.warn(warning);
    }
  }

  const frontendDeps = generatePieces(frontendPieces, requested.frontend, ctx);
  if (fields.length && [...requested.frontend, ...frontendDeps].some((piece) => piece !== 'nav'))
    printFrontendReports(syncFrontend(changes, names.p.kebab).reports.map(([path, report]) => [path, { ...report, added: [] }]));

  // The texts of the keys the new files use, in every language's catalog.
  const seed = resourceMessages(names);
  const pages = [...requested.frontend, ...frontendDeps].some((piece) => piece !== 'nav');
  syncMessages(changes, {
    frontend: pages ? seed.frontend : undefined,
    contracts: [...requested.backend, ...backendDeps].length ? seed.contracts : undefined,
  });

  return {
    dependencies: [
      ...backendDeps.map((key) => `backend ${key}`),
      ...frontendDeps.map((key) => `frontend ${key}`),
    ],
    next: nextSteps(
      [...requested.backend, ...backendDeps],
      [...requested.frontend, ...frontendDeps],
      fields.length > 0,
    ),
  };
}

const resourceOptions = (options: Partial<FrontendOptions>): ResourceOptions => ({
  icon: options.icon ?? 'FileIcon',
  section: options.section ?? (options.admin ? 'Admin' : 'CRM'),
  admin: options.admin ?? false,
});

/* ---------- Commands ---------- */

function common(command: Command) {
  return command
    .option('--root <dir>', 'Dafne folder (with apps/api/ and apps/frontend/); found from the current folder by default')
    .option('--dry-run', 'list what would change, write nothing')
    .option('--force', 'overwrite files that already exist')
    .option('--skip-wiring', "don't edit existing files to register the new code")
    .option('-y, --yes', 'never prompt; fail when an argument is missing');
}

function fieldOptions(command: Command) {
  return command.option(
    '--field <spec>',
    `a field of the new table, repeatable: ${FIELD_SPEC_HELP}`,
    (value: string, previous: string[] = []) => [...previous, value],
  );
}

/**
 * The fields for a new table: from --field, or asked when the table doesn't
 * exist yet and prompting is allowed.
 */
async function fieldsFor(name: string, options: CommonOptions & FieldOptions, createsTable: boolean): Promise<FieldSpec[]> {
  const specs = (options.field ?? []).map(parseFieldSpec);
  if (specs.length || !createsTable || !interactive(options)) return specs;
  const changes = new Changes(findRoot(options.root));
  if (changes.exists(tableFile(resourceNames(name)))) return [];
  const now = cancelled<boolean>(
    await p.confirm({ message: 'Add the fields of the table now?', initialValue: true }),
  );
  return now ? askNewFields(changes, name) : [];
}

/** Backend pieces that create the table (it's one of their dependencies). */
function createsTable(piece: string): boolean {
  return piece === 'table' || (backendPieces[piece]?.deps ?? []).some(createsTable);
}

function navOptions(command: Command) {
  return command
    .option('--icon <name>', 'lucide-react icon for the sidebar and the empty list', 'FileIcon')
    .option('--section <title>', 'sidebar section (created if missing; default CRM, or Admin with --admin)')
    .option('--admin', 'put the link in an admin-only section');
}

export function generateCommand() {
  const generate = new Command('generate')
    .alias('g')
    .description('Generate a resource (backend, frontend or both) or a single piece');

  common(fieldOptions(navOptions(
    generate
      .command('resource')
      .description('A whole resource: backend lib + contract + table, frontend pages + sidebar link')
      .argument('[name]', 'resource name, singular or plural (e.g. invoice)')
      .addOption(new Option('--backend', 'only the backend').conflicts('frontend'))
      .addOption(new Option('--frontend', 'only the frontend').conflicts('backend'))
      .addHelpText(
        'after',
        `
Without --field it asks for the fields of the new table (unless -y); the
sample "name" field stays. Examples:
  dafne-old g resource invoice --field number:string:length=20:required:unique \\
    --field status:enum:values=draft|sent|paid:default=draft --field dueDate:date \\
    --field notes:text:editor:api=detail --field customer:ref:to=customers`,
      ),
  ))).action(async (name: string | undefined, options: CommonOptions & FrontendOptions & FieldOptions & { backend?: boolean; frontend?: boolean }) => {
    p.intro('dafne-old generate resource');
    let target: Target = options.backend ? 'backend' : options.frontend ? 'frontend' : 'fullstack';
    if (!name && !options.backend && !options.frontend && interactive(options))
      target = await askChoice<Target>(undefined, options, 'What do you want to generate?', {
        fullstack: 'backend and frontend',
        backend: 'NestJS lib, contract, table',
        frontend: 'Next.js pages and sidebar link',
      });
    const resolved = await askName(name, options, 'Resource name', 'invoice');
    if (target === 'frontend' && options.field?.length)
      throw new Error('--field needs the backend: the fields go in the table.');
    const fields = await fieldsFor(resolved, options, target !== 'frontend');
    await run(options, (changes) =>
      generateResource(
        changes,
        resolved,
        {
          backend: target === 'frontend' ? [] : BACKEND_RESOURCE,
          frontend: target === 'backend' ? [] : FRONTEND_RESOURCE,
        },
        resourceOptions(options),
        fields,
      ),
    );
  });

  const backendChoices = Object.fromEntries(
    Object.entries(backendPieces).map(([key, piece]) => [key, piece.description]),
  );
  common(fieldOptions(
    generate
      .command('backend')
      .description(`A backend piece: ${Object.keys(backendPieces).join(' | ')}`)
      .argument('[piece]', Object.keys(backendPieces).join(' | '))
      .argument('[name]', 'resource name, singular or plural'),
  )).action(async (piece: string | undefined, name: string | undefined, options: CommonOptions & FieldOptions) => {
    p.intro('dafne-old generate backend');
    const key = await askChoice(piece, options, 'Which backend piece?', backendChoices);
    const resolved = await askName(name, options, 'Resource name', 'invoice');
    const fields = await fieldsFor(resolved, options, createsTable(key));
    await run(options, (changes) =>
      generateResource(changes, resolved, { backend: [key], frontend: [] }, resourceOptions({}), fields),
    );
  });

  const frontendChoices: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(frontendPieces).map(([key, piece]) => [key, piece.description]),
    ),
    ...FRONTEND_EXTRA,
  };
  common(navOptions(
    generate
      .command('frontend')
      .description(`A frontend piece: ${Object.keys(frontendChoices).join(' | ')}`)
      .argument('[piece]', Object.keys(frontendChoices).join(' | '))
      .argument('[name]', 'resource name; a route for page (reports/monthly); a name for component')
      .option('--client', 'component: add "use client"')
      .option('--dir <path>', 'component: folder inside apps/frontend/', 'components'),
  )).action(async (piece: string | undefined, name: string | undefined, options: CommonOptions & FrontendOptions) => {
    p.intro('dafne-old generate frontend');
    const key = await askChoice(piece, options, 'Which frontend piece?', frontendChoices);
    if (key === 'page') {
      const route = await askName(name, options, 'Route', 'reports/monthly');
      return run(options, (changes) => {
        generatePage(changes, route);
        return { next: ['dafne-old dev --only frontend'] };
      });
    }
    if (key === 'component') {
      const component = await askName(name, options, 'Component name', 'status-badge');
      return run(options, (changes) => {
        generateComponent(changes, component, options);
        return { next: [] };
      });
    }
    const resolved = await askName(name, options, 'Resource name', 'invoice');
    await run(options, (changes) =>
      generateResource(changes, resolved, { backend: [], frontend: [key] }, resourceOptions(options)),
    );
  });

  return generate;
}

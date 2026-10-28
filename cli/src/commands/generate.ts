import * as p from '@clack/prompts';
import { Command, Option } from 'commander';
import { Changes } from '../core/changes.js';
import { resourceNames } from '../core/names.js';
import { findRoot } from '../core/workspace.js';
import { BACKEND_RESOURCE, backendPieces } from '../generators/backend.js';
import {
  FRONTEND_RESOURCE,
  frontendPieces,
  generateComponent,
  generatePage,
} from '../generators/frontend.js';
import { generatePieces, type Ctx, type ResourceOptions } from '../generators/pieces.js';

interface CommonOptions {
  root?: string;
  dryRun?: boolean;
  force?: boolean;
  skipWiring?: boolean;
  yes?: boolean;
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
  page: 'Blank page at app/(app)/<route>/page.tsx',
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

/** Runs `generate` on an in-memory change set, then prints and writes it. */
async function run(
  options: CommonOptions,
  generate: (changes: Changes) => { dependencies?: string[]; next: string[] },
) {
  const root = findRoot(options.root);
  const changes = new Changes(root, {
    force: options.force,
    skipUpdates: options.skipWiring,
  });
  const { dependencies = [], next } = generate(changes);

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

function nextSteps(backend: string[], frontend: string[]): string[] {
  const steps: string[] = [];
  const pages = frontend.some((piece) => piece !== 'nav');
  if (backend.includes('table'))
    steps.push(
      'cd backend && pnpm migration:generate   # creates the table migration',
      '  check migration.sql: drizzle-kit 1.0.0-rc.5 drops "ON DELETE SET NULL" from foreign keys inside CREATE TABLE',
    );
  if (backend.length) steps.push('cd backend && pnpm test');
  if (pages)
    steps.push('cd frontend && pnpm dev   # also generates the PageProps types of new routes');
  if (backend.length || pages)
    steps.push('Replace the sample "name" field with the real ones (contract, table, service, form, columns).');
  return steps;
}

function resource(
  changes: Changes,
  name: string,
  requested: { backend: string[]; frontend: string[] },
  options: ResourceOptions,
) {
  const ctx: Ctx = { changes, names: resourceNames(name), options };
  const backendDeps = generatePieces(backendPieces, requested.backend, ctx);
  const frontendDeps = generatePieces(frontendPieces, requested.frontend, ctx);
  return {
    dependencies: [
      ...backendDeps.map((key) => `backend ${key}`),
      ...frontendDeps.map((key) => `frontend ${key}`),
    ],
    next: nextSteps(
      [...requested.backend, ...backendDeps],
      [...requested.frontend, ...frontendDeps],
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
    .option('--root <dir>', 'Dafne folder (with backend/ and frontend/); found from the current folder by default')
    .option('--dry-run', 'list what would change, write nothing')
    .option('--force', 'overwrite files that already exist')
    .option('--skip-wiring', "don't edit existing files to register the new code")
    .option('-y, --yes', 'never prompt; fail when an argument is missing');
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

  common(navOptions(
    generate
      .command('resource')
      .description('A whole resource: backend lib + contract + table, frontend pages + sidebar link')
      .argument('[name]', 'resource name, singular or plural (e.g. invoice)')
      .addOption(new Option('--backend', 'only the backend').conflicts('frontend'))
      .addOption(new Option('--frontend', 'only the frontend').conflicts('backend')),
  )).action(async (name: string | undefined, options: CommonOptions & FrontendOptions & { backend?: boolean; frontend?: boolean }) => {
    p.intro('dafne generate resource');
    let target: Target = options.backend ? 'backend' : options.frontend ? 'frontend' : 'fullstack';
    if (!name && !options.backend && !options.frontend && interactive(options))
      target = await askChoice<Target>(undefined, options, 'What do you want to generate?', {
        fullstack: 'backend and frontend',
        backend: 'NestJS lib, contract, table',
        frontend: 'Next.js pages and sidebar link',
      });
    const resolved = await askName(name, options, 'Resource name', 'invoice');
    await run(options, (changes) =>
      resource(
        changes,
        resolved,
        {
          backend: target === 'frontend' ? [] : BACKEND_RESOURCE,
          frontend: target === 'backend' ? [] : FRONTEND_RESOURCE,
        },
        resourceOptions(options),
      ),
    );
  });

  const backendChoices = Object.fromEntries(
    Object.entries(backendPieces).map(([key, piece]) => [key, piece.description]),
  );
  common(
    generate
      .command('backend')
      .description(`A backend piece: ${Object.keys(backendPieces).join(' | ')}`)
      .argument('[piece]', Object.keys(backendPieces).join(' | '))
      .argument('[name]', 'resource name, singular or plural'),
  ).action(async (piece: string | undefined, name: string | undefined, options: CommonOptions) => {
    p.intro('dafne generate backend');
    const key = await askChoice(piece, options, 'Which backend piece?', backendChoices);
    const resolved = await askName(name, options, 'Resource name', 'invoice');
    await run(options, (changes) =>
      resource(changes, resolved, { backend: [key], frontend: [] }, resourceOptions({})),
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
      .option('--dir <path>', 'component: folder inside frontend/', 'components'),
  )).action(async (piece: string | undefined, name: string | undefined, options: CommonOptions & FrontendOptions) => {
    p.intro('dafne generate frontend');
    const key = await askChoice(piece, options, 'Which frontend piece?', frontendChoices);
    if (key === 'page') {
      const route = await askName(name, options, 'Route', 'reports/monthly');
      return run(options, (changes) => {
        generatePage(changes, route);
        return { next: ['cd frontend && pnpm dev'] };
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
      resource(changes, resolved, { backend: [], frontend: [key] }, resourceOptions(options)),
    );
  });

  return generate;
}

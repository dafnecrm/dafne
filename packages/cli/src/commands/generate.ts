import * as p from '@clack/prompts';
import { Command } from 'commander';
import { FsTree } from 'nx/src/generators/tree.js';
import { Changes } from '../core/changes.ts';
import { findFrontendTarget, frontendLibs, libName } from '../core/frontend-target.ts';
import { DEFAULT_ID_LENGTH, ID_TYPES, idSpec, type IdSpec, type IdType } from '../core/id.ts';
import { resourceNames } from '../core/names.ts';
import { findWorkspaceRoot, runNx } from '../core/nx.ts';
import { backendLib, DEFAULT_APP, DEFAULT_FRONTEND_APP, frontendApp, frontendLib } from '../core/workspace.ts';
import { FIELD_SPEC_HELP, formatFieldSpec, parseFieldSpec } from '../fields/parse.ts';
import { backendLibs, tableFile } from '../pieces/backend.ts';
import { askNewFields, cancelled, interactive } from './field-prompts.ts';

/*
 * `dafne g <kind> [name]`: asks for what's missing, then runs the generator
 * of this package with the same name, through `nx g @dafne/cli:<kind>`.
 */

const KINDS = {
  'backend-resource': { hint: 'contract + table + lib with service and controller', placeholder: 'invoice' },
  'backend-lib': { hint: 'an empty Nest lib in packages/backend', placeholder: 'reports' },
  'backend-app': { hint: 'a NestJS app in apps/', placeholder: 'worker' },
  contract: { hint: 'Zod schemas and response types in packages/contracts', placeholder: 'invoice' },
  'frontend-resource': { hint: 'the pages of a resource: list, detail, form, actions, data, sidebar link', placeholder: 'invoice' },
  'frontend-list': { hint: 'the list page of a resource', placeholder: 'invoice' },
  'frontend-detail': { hint: 'the detail page of a resource', placeholder: 'invoice' },
  'frontend-form': { hint: 'the create/edit form of a resource', placeholder: 'invoice' },
  'frontend-actions': { hint: 'server actions, form schema and delete dialog of a resource', placeholder: 'invoice' },
  'frontend-data': { hint: 'API types, fetchers and table config of a resource', placeholder: 'invoice' },
  'frontend-nav': { hint: "a resource's sidebar link", placeholder: 'invoice' },
  'frontend-lib': { hint: 'an empty lib in packages/frontend, used by a frontend app', placeholder: 'charts' },
  'frontend-app': { hint: 'a Next.js app in apps/', placeholder: 'billing-web' },
} as const;
type Kind = keyof typeof KINDS;

/** Kinds named after a resource (singular or plural). */
const RESOURCE_KINDS: Kind[] = ['backend-resource', 'contract', 'frontend-resource', 'frontend-list', 'frontend-detail', 'frontend-form', 'frontend-actions', 'frontend-data', 'frontend-nav'];
/** Kinds with an --app: a backend app, or a frontend one. */
const BACKEND_APP_KINDS: Kind[] = ['backend-resource', 'backend-lib'];
const FRONTEND_APP_KINDS: Kind[] = ['frontend-resource', 'frontend-list', 'frontend-detail', 'frontend-form', 'frontend-actions', 'frontend-data', 'frontend-nav', 'frontend-lib'];
/** Kinds that go into the app or into a frontend lib (--lib); backend-resource takes --lib too, a backend lib. */
const LIB_KINDS: Kind[] = ['frontend-resource', 'frontend-list', 'frontend-detail', 'frontend-form', 'frontend-actions', 'frontend-data'];
/** Kinds with --icon, and with --section/--admin. */
const ICON_KINDS: Kind[] = ['frontend-resource', 'frontend-list', 'frontend-nav'];
const SECTION_KINDS: Kind[] = ['frontend-resource', 'frontend-nav'];

interface GenerateOptions {
  app?: string;
  lib?: string;
  field?: string[];
  idType?: string;
  idLength?: string;
  port?: string;
  backendUrl?: string;
  icon?: string;
  section?: string;
  admin?: boolean;
  dryRun?: boolean;
  force?: boolean;
  yes?: boolean;
}

async function askKind(value: string | undefined, options: GenerateOptions): Promise<Kind> {
  if (value) {
    if (!(value in KINDS)) {
      throw new Error(`"${value}" isn't one of: ${Object.keys(KINDS).join(', ')}.`);
    }
    return value as Kind;
  }
  if (!interactive(options)) {
    throw new Error(`Missing argument: pick one of ${Object.keys(KINDS).join(', ')}.`);
  }
  return cancelled<Kind>(
    await p.select<Kind>({
      message: 'What do you want to generate?',
      options: (Object.keys(KINDS) as Kind[]).map((key) => ({ value: key, label: key, hint: KINDS[key].hint })),
    }),
  );
}

async function askName(value: string | undefined, kind: Kind, options: GenerateOptions): Promise<string> {
  if (value) {
    return value;
  }
  if (!interactive(options)) {
    throw new Error('Missing argument: the name.');
  }
  return cancelled<string>(
    await p.text({
      message: RESOURCE_KINDS.includes(kind) ? 'Resource name (singular or plural)' : 'Name',
      placeholder: KINDS[kind].placeholder,
      validate: (input) => (input?.trim() ? undefined : 'Required'),
    }),
  ).trim();
}

/** The fields of a new resource: from --field, or asked (unless -y). */
async function resourceFields(root: string, name: string, options: GenerateOptions): Promise<string[]> {
  if (options.field?.length) {
    return options.field.map((text) => formatFieldSpec(parseFieldSpec(text)));
  }
  if (!interactive(options)) {
    return [];
  }
  // The prompts read the workspace (tables, ref targets) as it is on disk.
  const changes = new Changes(new FsTree(root, false));
  if (changes.exists(tableFile(resourceNames(name)))) {
    return [];
  }
  const now = cancelled<boolean>(await p.confirm({ message: 'Add the fields of the table now?', initialValue: true }));
  if (!now) {
    return [];
  }
  return (await askNewFields(changes, name)).map(formatFieldSpec);
}

const ID_HINTS: Record<IdType, string> = {
  serial: 'an integer the database picks (default)',
  uuid: 'a random uuid the database picks',
  varchar: 'text of a given length, random by default',
};

/** The id of a new resource: from --id-type/--id-length, or asked (unless -y). */
async function resourceId(root: string, name: string, options: GenerateOptions): Promise<IdSpec> {
  const length = (value: string | undefined) => {
    if (value === undefined) {
      return undefined;
    }
    if (!/^[1-9]\d*$/.test(value)) {
      throw new Error('--id-length must be a positive whole number.');
    }
    return Number(value);
  };
  const ask = interactive(options) && !new Changes(new FsTree(root, false)).exists(tableFile(resourceNames(name)));
  let type = options.idType;
  if (!type && ask) {
    type = cancelled<IdType>(
      await p.select<IdType>({
        message: 'Type of the id',
        initialValue: 'serial',
        options: ID_TYPES.map((value) => ({ value, label: value, hint: ID_HINTS[value] })),
      }),
    );
  }
  let idLength = length(options.idLength);
  if (type === 'varchar' && idLength === undefined && ask) {
    idLength = Number(
      cancelled<string>(
        await p.text({
          message: 'Length of the id',
          initialValue: String(DEFAULT_ID_LENGTH),
          validate: (input) => (/^[1-9]\d*$/.test(input?.trim() ?? '') && Number(input) <= 255 ? undefined : 'A whole number from 1 to 255'),
        }),
      ).trim(),
    );
  }
  return idSpec(type, idLength);
}

const NEW_LIB = '\0new';

/**
 * The lib a resource's frontend goes into (undefined: the app): --lib, or
 * none when the resource already has a place (the generator finds it), or
 * asked: the app, an existing lib or a new one (unless -y: the app).
 */
async function frontendLibOf(root: string, kind: Kind, name: string, options: GenerateOptions): Promise<string | undefined> {
  if (!LIB_KINDS.includes(kind)) {
    return undefined;
  }
  if (options.lib) {
    return libName(options.lib);
  }
  const app = options.app ?? DEFAULT_FRONTEND_APP;
  const changes = new Changes(new FsTree(root, false));
  const names = resourceNames(name);
  const found = findFrontendTarget(changes, names, app);
  if (found) {
    if (interactive(options)) {
      p.log.info(`The frontend of ${names.p.kebab} is in ${found.kind === 'app' ? frontendApp(app) : frontendLib(found.lib)}: generating there.`);
    }
    return undefined;
  }
  if (!interactive(options)) {
    return undefined;
  }
  const where = cancelled<'app' | 'lib'>(
    await p.select<'app' | 'lib'>({
      message: 'Where should the code go?',
      initialValue: 'app',
      options: [
        { value: 'app', label: frontendApp(app), hint: 'pages, data and components in the app' },
        { value: 'lib', label: 'a frontend lib', hint: 'data, actions, components and texts in packages/frontend; the pages stay in the app' },
      ],
    }),
  );
  if (where === 'app') {
    return undefined;
  }
  const choice = cancelled<string>(
    await p.select<string>({
      message: 'Which lib?',
      initialValue: NEW_LIB,
      options: [
        { value: NEW_LIB, label: 'a new lib', hint: 'packages/frontend/<name>' },
        ...frontendLibs(changes).map((lib) => ({ value: lib, label: lib, hint: frontendLib(lib) })),
      ],
    }),
  );
  if (choice !== NEW_LIB) {
    return choice;
  }
  const lib = cancelled<string>(
    await p.text({
      message: 'Name of the lib',
      initialValue: names.p.kebab,
      validate: (input) => {
        try {
          const lib = libName(input ?? '');
          return changes.exists(`${frontendLib(lib)}/package.json`) ? `${frontendLib(lib)} exists: pick it from the list` : undefined;
        } catch (error) {
          return (error as Error).message;
        }
      },
    }),
  );
  return libName(lib);
}

/**
 * The backend lib a new resource's module goes into (undefined: a lib of its
 * own): --lib, or asked (unless -y, or the resource exists already).
 */
async function backendLibOf(root: string, name: string, options: GenerateOptions): Promise<string | undefined> {
  if (options.lib) {
    return libName(options.lib);
  }
  const changes = new Changes(new FsTree(root, false));
  const names = resourceNames(name);
  if (!interactive(options) || changes.exists(tableFile(names))) {
    return undefined;
  }
  const choice = cancelled<string>(
    await p.select<string>({
      message: 'Where should the module go?',
      initialValue: NEW_LIB,
      options: [
        { value: NEW_LIB, label: 'a new lib', hint: backendLib(names.p.kebab) },
        ...backendLibs(changes)
          .filter((lib) => lib !== names.p.kebab)
          .map((lib) => ({ value: lib, label: lib, hint: `${backendLib(lib)}/src/${names.p.kebab}` })),
      ],
    }),
  );
  return choice === NEW_LIB ? undefined : choice;
}

export function generateCommand() {
  return new Command('generate')
    .alias('g')
    .description('Generate backend and frontend code: resources, their parts, libs, apps, contracts (Nx generators of @dafne/cli)')
    .argument('[kind]', Object.keys(KINDS).join(' | '))
    .argument('[name]', 'name: a resource or contract is singular or plural (invoice), a lib or app as it is')
    .option(
      '--app <name>',
      `the app to generate into (apps/<name>): backend-lib, backend-resource (default ${DEFAULT_APP}); frontend-resource and its parts, frontend-lib (default ${DEFAULT_FRONTEND_APP})`,
    )
    .option(
      '--lib <name>',
      'frontend-resource and its parts but nav: the frontend lib (packages/frontend/<name>, created if missing) for the data, actions, components and texts; the pages stay in the app (default: where the resource is, else asked, else the app). backend-resource: an existing backend lib for the module (packages/backend/<name>/src/<plural>; default: asked, else a new lib)',
    )
    .option('--field <spec>', `backend-resource: a field of the new table, repeatable: ${FIELD_SPEC_HELP}`, (value: string, previous: string[] = []) => [
      ...previous,
      value,
    ])
    .option('--id-type <type>', `backend-resource: type of the id, ${ID_TYPES.join(' | ')} (default serial)`)
    .option('--id-length <n>', `backend-resource: length of a varchar id (default ${DEFAULT_ID_LENGTH})`)
    .option('--port <port>', 'backend-app, frontend-app: default port')
    .option('--backend-url <url>', "frontend-app: the app's API (BACKEND_URL)")
    .option('--icon <name>', 'frontend-resource, frontend-list, frontend-nav: lucide-react icon (e.g. ReceiptIcon)')
    .option('--section <title>', 'frontend-resource, frontend-nav: sidebar section (created if missing; default CRM, or Admin with --admin)')
    .option('--admin', 'frontend-resource, frontend-nav: put the link in an admin-only section')
    .option('--dry-run', 'show what would change, write nothing')
    .option('--force', 'overwrite files that already exist')
    .option('-y, --yes', 'never prompt; fail when an argument is missing')
    .addHelpText(
      'after',
      `
Examples:
  dafne g backend-resource invoice --field number:string:length=20:required:unique \\
    --field status:enum:values=draft|sent|paid:default=draft --field customer:ref:to=customers
  dafne g backend-resource payment --id-type uuid
  dafne g backend-resource voucher --id-type varchar --id-length 12
  dafne g backend-resource sales-order-type --lib sales-orders   # in packages/backend/sales-orders/src/sales-order-types
  dafne g frontend-resource invoice --icon ReceiptIcon
  dafne g frontend-resource invoice --lib invoices   # in packages/frontend/invoices
  dafne g frontend-detail invoice          # one part (and the parts it needs), where the resource is
  dafne g backend-lib reports
  dafne g backend-app worker --port 3002
  dafne g frontend-app billing-web --port 4001
  dafne g frontend-lib charts --app billing-web
  dafne g contract report

Same as: nx g @dafne/cli:<kind> <name> ...`,
    )
    .action(async (kindArg: string | undefined, nameArg: string | undefined, options: GenerateOptions) => {
      const root = findWorkspaceRoot();
      if (interactive(options)) {
        p.intro('dafne generate');
      }
      const kind = await askKind(kindArg, options);
      const name = await askName(nameArg, kind, options);
      const only = (option: string, kinds: Kind[], set: unknown) => {
        if (set !== undefined && !kinds.includes(kind)) {
          throw new Error(`${option} is only for ${kinds.join(', ')}.`);
        }
      };
      only('--field', ['backend-resource'], options.field);
      only('--id-type', ['backend-resource'], options.idType);
      only('--id-length', ['backend-resource'], options.idLength);
      only('--app', [...BACKEND_APP_KINDS, ...FRONTEND_APP_KINDS], options.app);
      only('--lib', [...LIB_KINDS, 'backend-resource'], options.lib);
      only('--port', ['backend-app', 'frontend-app'], options.port);
      only('--backend-url', ['frontend-app'], options.backendUrl);
      only('--icon', ICON_KINDS, options.icon);
      only('--section', SECTION_KINDS, options.section);
      only('--admin', SECTION_KINDS, options.admin);

      const args = ['g', `@dafne/cli:${kind}`, name, '--no-interactive'];
      if (kind === 'backend-resource') {
        const backend = await backendLibOf(root, name, options);
        if (backend) {
          args.push(`--lib=${backend}`);
        }
        const id = await resourceId(root, name, options);
        if (id.type !== 'serial') {
          args.push(`--idType=${id.type}`);
        }
        if (id.length !== undefined) {
          args.push(`--idLength=${id.length}`);
        }
        for (const spec of await resourceFields(root, name, options)) {
          args.push(`--fields=${spec}`);
        }
      }
      if (options.app) {
        args.push(`--app=${options.app}`);
      }
      const lib = await frontendLibOf(root, kind, name, options);
      if (lib) {
        args.push(`--lib=${lib}`);
      }
      if (options.port) {
        args.push(`--port=${options.port}`);
      }
      if (options.backendUrl) {
        args.push(`--backendUrl=${options.backendUrl}`);
      }
      if (options.icon) {
        args.push(`--icon=${options.icon}`);
      }
      if (options.section) {
        args.push(`--section=${options.section}`);
      }
      if (options.admin) {
        args.push('--admin');
      }
      if (options.force) {
        args.push('--force');
      }
      if (options.dryRun) {
        args.push('--dry-run');
      }

      if (interactive(options)) {
        p.log.step(`nx ${args.join(' ')}`);
      }
      process.exitCode = await runNx(root, args);
    });
}

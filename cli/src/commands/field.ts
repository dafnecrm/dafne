import { syncMessages } from '../wiring/messages.js';
import * as p from '@clack/prompts';
import { Command, Option } from 'commander';
import { Changes } from '../core/changes.js';
import { resourceNames } from '../core/names.js';
import { findRoot } from '../core/workspace.js';
import {
  addField,
  listFields,
  listRefTargets,
  listResources,
  removeField,
  type FieldResult,
} from '../fields/operations.js';
import {
  FIELD_TYPES,
  ON_DELETE,
  RELATIONS,
  type FieldSpec,
  type FieldType,
  type OnDelete,
  type RelationKind,
} from '../fields/spec.js';
import { contractFile } from '../generators/backend.js';
import { API_TAGS } from '../sync/table.js';
import { printSync, syncOne } from './sync.js';

interface CommonOptions {
  root?: string;
  dryRun?: boolean;
  sync?: boolean;
  yes?: boolean;
}

interface AddOptions extends CommonOptions {
  length?: string;
  values?: string;
  precision?: string;
  scale?: string;
  required?: boolean;
  unique?: boolean;
  index?: boolean;
  default?: string;
  api?: string;
  editor?: boolean;
  after?: string;
  to?: string;
  relation?: RelationKind;
  onDelete?: OnDelete;
  inverse?: string | false;
}

const interactive = (options: CommonOptions) => !options.yes && process.stdin.isTTY;

function cancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Nothing changed.');
    process.exit(1);
  }
  return value as T;
}

const int = (value: string | undefined, flag: string) => {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${flag} must be a positive whole number.`);
  return n;
};

const list = (value: string | undefined) =>
  value
    ?.split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const RELATION_HINTS: Record<RelationKind, string> = {
  'many-to-one': 'many rows here, one there: the key is here',
  'one-to-one': 'a unique key here',
  'one-to-many': 'one row here, many there: the key goes there',
  'many-to-many': 'a junction table',
};

async function pick(message: string, values: string[], hints: Record<string, string> = {}): Promise<string> {
  if (!values.length) throw new Error(`Nothing to choose for "${message}".`);
  return cancelled<string>(
    await p.select<string>({
      message,
      options: values.map((value) => ({ value, label: value, hint: hints[value] })),
    }),
  );
}

async function ask(message: string, options: { placeholder?: string; initial?: string; optional?: boolean; validate?: (v: string) => string | undefined } = {}) {
  const value = cancelled<string>(
    await p.text({
      message,
      placeholder: options.placeholder,
      initialValue: options.initial,
      validate: (input) => {
        const v = input?.trim() ?? '';
        if (!v) return options.optional ? undefined : 'Required';
        return options.validate?.(v);
      },
    }),
  );
  return value?.trim() || undefined;
}

const positiveInt = (v: string) => (/^[1-9]\d*$/.test(v) ? undefined : 'A positive whole number');

/**
 * Fills in what the command line left out. Without a TTY (or with -y) a
 * missing argument is an error. When an argument was missing, the optional
 * settings (required, unique, index, default, @api) are asked too; when all
 * were given, flags are taken as they are.
 */
async function askAdd(
  changes: Changes,
  args: { resource?: string; name?: string; type?: string },
  options: AddOptions,
  { always = false }: { always?: boolean } = {},
): Promise<{ resource: string; name: string; type: FieldType }> {
  const can = interactive(options);
  const wizard = can && (always || !args.resource || !args.name || !args.type);
  const need = (what: string) => {
    if (!can) throw new Error(`Missing argument: ${what}.`);
  };

  let { resource, name, type } = args;
  if (!resource) {
    need('the resource (e.g. activities)');
    resource = await pick('Table', listResources(changes));
  }
  if (!name) {
    need('the field name');
    name = (await ask('Field name', { placeholder: 'dueDate (for a ref: the relation, e.g. customer)' }))!;
  }
  if (type) {
    if (!(FIELD_TYPES as readonly string[]).includes(type))
      throw new Error(`"${type}" isn't a type: use ${FIELD_TYPES.join(', ')}.`);
  } else {
    need(`the type (${FIELD_TYPES.join(', ')})`);
    type = await pick('Type', [...FIELD_TYPES], { ref: 'foreign key and relation' });
  }

  // Settings each type can't do without.
  if (type === 'enum' && !options.values) {
    if (!can) throw new Error('An enum needs --values, e.g. --values email,phone.');
    options.values = await ask('Values (comma-separated)', { placeholder: 'email,phone' });
  }
  if (type === 'ref') {
    if (!options.to) {
      if (!can) throw new Error('A ref needs --to <resource>.');
      options.to = await pick('Related table', listRefTargets(changes));
    }
    if (!options.relation && can)
      options.relation = (await pick('Relation', [...RELATIONS], RELATION_HINTS)) as RelationKind;
  }

  if (!wizard) return { resource, name, type: type as FieldType };

  // Type details, with the defaults as initial values.
  if (type === 'string' && options.length === undefined)
    options.length = await ask('Max length', { initial: '255', validate: positiveInt });
  if (type === 'decimal') {
    options.precision ??= await ask('Digits (precision)', { initial: '10', validate: positiveInt });
    options.scale ??= await ask('Digits after the point (scale)', { initial: '2', validate: (v) => (/^\d+$/.test(v) ? undefined : 'A whole number') });
  }

  const flags = cancelled<string[]>(
    await p.multiselect<string>({
      message: 'Options (space to toggle, enter to confirm)',
      required: false,
      initialValues: [
        ...(options.required ? ['required'] : []),
        ...(options.unique ? ['unique'] : []),
        ...(options.index ? ['index'] : []),
      ],
      options: [
        { value: 'required', label: 'required', hint: 'NOT NULL' },
        ...(type === 'ref' ? [] : [{ value: 'unique', label: 'unique' }, { value: 'index', label: 'index' }]),
      ],
    }),
  );
  options.required = flags.includes('required');
  options.unique = flags.includes('unique');
  options.index = flags.includes('index');

  if (type === 'ref') {
    if (!options.onDelete) {
      const fallback: OnDelete = options.required ? 'restrict' : 'set null';
      const choices = ON_DELETE.filter((a) => !(options.required && a === 'set null'));
      options.onDelete = cancelled<OnDelete>(
        await p.select<OnDelete>({
          message: 'When the related row is deleted',
          initialValue: fallback,
          options: choices.map((value) => ({ value, label: value, hint: value === fallback ? 'default' : undefined })),
        }),
      );
    }
    if (options.inverse === undefined && options.relation !== 'one-to-many') {
      const inverse = await ask('Name of the relation on the other table (empty: default, "-": none)', { optional: true });
      options.inverse = inverse === '-' ? false : inverse;
    }
  } else if (options.default === undefined) {
    options.default = await ask(
      `Default value (empty: none${type === 'date' || type === 'datetime' ? '; "now" for the current time' : ''})`,
      { optional: true, placeholder: type === 'enum' ? options.values?.split(',')[0] : undefined },
    );
  }

  if (type === 'text' && options.editor === undefined)
    options.editor =
      cancelled<string>(
        await p.select<string>({
          message: 'Input in the form',
          initialValue: 'plain',
          options: [
            { value: 'plain', label: 'plain', hint: 'a textarea' },
            { value: 'editor', label: 'editor', hint: 'rich text, saved as HTML' },
          ],
        }),
      ) === 'editor';

  if (options.api === undefined) {
    const tags = cancelled<string[]>(
      await p.multiselect<string>({
        message: 'Contract tags (none: the defaults)',
        required: false,
        options: [
          { value: 'internal', label: 'internal', hint: 'backend only, never in the contract' },
          { value: 'readonly', label: 'readonly', hint: 'in responses, not in the body' },
          { value: 'writeonly', label: 'writeonly', hint: 'in the body only' },
          { value: 'detail', label: 'detail', hint: 'in the detail, not in the list' },
          { value: 'nofilter', label: 'nofilter' },
          { value: 'nosort', label: 'nosort' },
        ],
      }),
    );
    options.api = tags.join(',');
  }
  return { resource, name, type: type as FieldType };
}

/** The field from the options of `field add` (or of a --field spec); throws on invalid ones. */
export function toSpec(name: string, type: FieldType, options: AddOptions): FieldSpec {
  const spec: FieldSpec = {
    name,
    type,
    required: options.required ?? false,
    unique: options.unique ?? false,
    index: options.index ?? false,
    length: int(options.length, '--length'),
    values: list(options.values),
    precision: int(options.precision, '--precision'),
    scale: options.scale === undefined ? undefined : Number(options.scale),
    default: options.default,
    api: list(options.api) ?? [],
    editor: options.editor,
    after: options.after,
    to: options.to,
    relation: options.relation ?? 'many-to-one',
    onDelete: options.onDelete,
    inverse: options.inverse,
  };
  if (spec.editor && spec.type !== 'text') throw new Error('--editor is only for text fields.');
  for (const tag of spec.api)
    if (!(API_TAGS as readonly string[]).includes(tag)) throw new Error(`Unknown @api tag "${tag}": use ${API_TAGS.join(', ')}.`);
  return spec;
}

/** Options a --field spec can carry after `name:type`. */
const SPEC_FLAGS = ['required', 'unique', 'index', 'editor'] as const;
const SPEC_VALUES = ['length', 'values', 'default', 'precision', 'scale', 'api', 'to', 'relation', 'on-delete', 'inverse'] as const;

/** The syntax of --field, for help texts. */
export const FIELD_SPEC_HELP = `name:type[:option…], options: ${SPEC_FLAGS.join(', ')}, ${SPEC_VALUES.map((v) => `${v}=…`).join(', ')}; lists with |`;

/**
 * A field from `name:type[:option…]`, e.g. `status:enum:values=open|done:required`
 * or `customer:ref:to=customers`. Lists (values, api) are separated by |.
 */
export function parseFieldSpec(text: string): FieldSpec {
  const [name, type, ...rest] = text.split(':').map((part) => part.trim());
  if (!name || !type) throw new Error(`--field "${text}": use ${FIELD_SPEC_HELP}.`);
  if (!(FIELD_TYPES as readonly string[]).includes(type))
    throw new Error(`--field "${text}": "${type}" isn't a type; use ${FIELD_TYPES.join(', ')}.`);
  const options: AddOptions = {};
  for (const option of rest) {
    const [key, ...valueParts] = option.split('=');
    const value = valueParts.join('=');
    if ((SPEC_FLAGS as readonly string[]).includes(key) && !valueParts.length) {
      options[key as (typeof SPEC_FLAGS)[number]] = true;
      continue;
    }
    if (!(SPEC_VALUES as readonly string[]).includes(key) || !valueParts.length)
      throw new Error(`--field "${text}": unknown option "${option}"; use ${FIELD_SPEC_HELP}.`);
    const listValue = value.replace(/\|/g, ',');
    switch (key) {
      case 'values':
      case 'api':
        options[key] = listValue;
        break;
      case 'relation':
        if (!(RELATIONS as readonly string[]).includes(value)) throw new Error(`--field "${text}": relation must be ${RELATIONS.join(', ')}.`);
        options.relation = value as RelationKind;
        break;
      case 'on-delete':
        if (!(ON_DELETE as readonly string[]).includes(value)) throw new Error(`--field "${text}": on-delete must be ${ON_DELETE.join(', ')}.`);
        options.onDelete = value as OnDelete;
        break;
      case 'inverse':
        options.inverse = value === '-' ? false : value;
        break;
      default:
        options[key as 'length' | 'default' | 'precision' | 'scale' | 'to'] = value;
    }
  }
  if (type === 'enum' && !options.values) throw new Error(`--field "${text}": an enum needs values=a|b.`);
  if (type === 'ref' && !options.to) throw new Error(`--field "${text}": a ref needs to=<resource>.`);
  return toSpec(name, type as FieldType, options);
}

/**
 * Asks for the fields of a new resource, one at a time, with the same
 * questions as `field add`; an empty name ends the list.
 */
export async function askNewFields(changes: Changes, resource: string): Promise<FieldSpec[]> {
  const specs: FieldSpec[] = [];
  for (;;) {
    const name = await ask(specs.length ? 'Next field (empty: done)' : 'Field name (empty: done)', {
      optional: true,
      placeholder: 'dueDate (for a ref: the relation, e.g. customer)',
    });
    if (!name) return specs;
    if (specs.some((spec) => spec.name === name) || name === 'name') {
      p.log.warn(`"${name}" is already a field.`);
      continue;
    }
    const options: AddOptions = {};
    const { type } = await askAdd(changes, { resource, name }, options, { always: true });
    specs.push(toSpec(name, type, options));
  }
}

/** Writes the table changes, then syncs the contracts of the touched resources. */
async function finish(changes: Changes, result: FieldResult, options: CommonOptions) {
  const tableChanges = changes.summary();
  p.note(
    tableChanges.map(({ path, kind }) => `${kind === 'create' ? '+' : '~'} ${path}`).join('\n') || 'Nothing to change',
    options.dryRun ? 'Would change (dry run)' : 'Changes',
  );
  for (const note of result.notes) p.log.info(note);
  if (!tableChanges.length) return;

  if (options.sync !== false)
    for (const resource of new Set(result.touched)) {
      if (!changes.exists(contractFile(resourceNames(resource)))) continue;
      const before = changes.summary().length;
      const report = await syncOne(changes, resource, result.dropped[resource]);
      printSync(`contract ${resource}`, report, changes.summary().length > before);
    }

  if (options.dryRun) return p.outro('Dry run: nothing written.');
  {
        const note = syncMessages(changes);
        if (note) p.log.warn(note);
      }
      await changes.commit();
  p.note(
    [
      'dafne migration generate   # fixes the foreign keys drizzle-kit 1.0.0-rc.5 gets wrong',
      'cd backend && npx tsc --noEmit && pnpm test',
      'dafne sync frontend <resource>   # form, table and detail',
    ].join('\n'),
    'Next steps',
  );
  p.outro('Done.');
}

function common(command: Command) {
  return command
    .option('--root <dir>', 'Dafne folder (with backend/ and frontend/)')
    .option('--dry-run', 'show what would change, write nothing')
    .option('--no-sync', "don't update the contracts afterwards")
    .option('-y, --yes', 'never prompt');
}

export function fieldCommand() {
  const field = new Command('field').description('Add or remove a column (or a relation) of a table');

  common(
    field
      .command('add')
      .description('Add a column to a table; a ref adds a foreign key and its relations')
      .argument('[resource]', 'the table, by resource name (e.g. activities)')
      .argument('[name]', 'column name, e.g. dueDate; for a ref, the relation name (customer)')
      .argument('[type]', FIELD_TYPES.join(' | '))
      .option('--required', 'NOT NULL')
      .option('--unique', 'unique values')
      .option('--index', 'add an index')
      .option('--default <value>', 'default: a number, true/false, now (dates) or text')
      .option('--length <n>', 'string: max length (default 255)')
      .option('--values <list>', 'enum: comma-separated values')
      .option('--precision <n>', 'decimal: digits (default 10)')
      .option('--scale <n>', 'decimal: digits after the point (default 2)')
      .option('--api <tags>', `@api tags for the contract, comma-separated: ${API_TAGS.join(', ')}`)
      .option('--editor', 'text: a rich text editor in the form (@form editor) instead of a textarea')
      .option('--after <column>', 'put it after this column (default: before createdAt)')
      .option('--to <resource>', 'ref: the related resource')
      .addOption(new Option('--relation <kind>', 'ref: relation seen from this table').choices(RELATIONS))
      .addOption(new Option('--on-delete <action>', 'ref: when the related row is deleted (default: set null, or restrict if required)').choices(ON_DELETE))
      .option('--inverse <name>', 'ref: name of the reverse relation on the other table')
      .option('--no-inverse', 'ref: no reverse relation')
      .addHelpText(
        'after',
        `
Examples:
  dafne field add activities dueDate datetime
  dafne field add activities status enum --values open,done --required --default open
  dafne field add activities notes text --api internal
  dafne field add activities description text --editor               # rich text editor in the form
  dafne field add activities customer ref --to customers               # customerId + activity.customer / customer.activities
  dafne field add activities customer ref --to customers --relation one-to-one
  dafne field add customers activities ref --to activities --relation one-to-many
  dafne field add activities tags ref --to tags --relation many-to-many  # junction table activity_tag`,
      ),
  ).action(async (resourceArg: string | undefined, nameArg: string | undefined, typeArg: string | undefined, options: AddOptions) => {
    p.intro('dafne field add');
    const changes = new Changes(findRoot(options.root));
    const { resource, name, type: resolved } = await askAdd(changes, { resource: resourceArg, name: nameArg, type: typeArg }, options);
    const spec = toSpec(name, resolved, options);
    const result = addField(changes, resource, spec);
    await finish(changes, result, options);
  });

  common(
    field
      .command('remove')
      .description('Remove a column (with its indexes and relations), or a one-to-many / many-to-many relation')
      .argument('[resource]', 'the table, by resource name')
      .argument('[name]', 'column or relation name (customer, customerId, tags…)'),
  ).action(async (resourceArg: string | undefined, nameArg: string | undefined, options: CommonOptions) => {
    p.intro('dafne field remove');
    const changes = new Changes(findRoot(options.root));
    const can = interactive(options);
    let resource = resourceArg;
    if (!resource) {
      if (!can) throw new Error('Missing argument: the resource (e.g. activities).');
      resource = await pick('Table', listResources(changes));
    }
    let name = nameArg;
    if (!name) {
      if (!can) throw new Error('Missing argument: the column or relation to remove.');
      const { columns, relations } = listFields(changes, resource);
      const hints: Record<string, string> = Object.fromEntries(relations.map((r) => [r, 'relation']));
      name = await pick('Field to remove', [...columns, ...relations], hints);
      const sure = cancelled<boolean>(await p.confirm({ message: `Remove ${name} from ${resource}?`, initialValue: false }));
      if (!sure) return p.cancel('Nothing changed.');
    }
    const result = removeField(changes, resource, name);
    await finish(changes, result, options);
  });

  return field;
}

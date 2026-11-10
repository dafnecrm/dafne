import * as p from '@clack/prompts';
import type { Changes } from '../core/changes.ts';
import { listRefTargets, listResources } from '../fields/operations.ts';
import { toSpec, type AddOptions } from '../fields/parse.ts';
import { FIELD_TYPES, ON_DELETE, RELATIONS, type FieldSpec, type FieldType, type OnDelete, type RelationKind } from '../fields/spec.ts';

/*
 * The questions for the fields of a new table, as in the old `field add`
 * wizard. They read the workspace (tables, ref targets) through `changes`.
 */

export const interactive = (options: { yes?: boolean }) => !options.yes && process.stdin.isTTY;

export function cancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Nothing generated.');
    process.exit(1);
  }
  return value as T;
}

const RELATION_HINTS: Record<RelationKind, string> = {
  'many-to-one': 'many rows here, one there: the key is here',
  'one-to-one': 'a unique key here',
  'one-to-many': 'one row here, many there: the key goes there',
  'many-to-many': 'a junction table',
};

async function pick(message: string, values: string[], hints: Record<string, string> = {}): Promise<string> {
  if (!values.length) {
    throw new Error(`Nothing to choose for "${message}".`);
  }
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
        if (!v) {
          return options.optional ? undefined : 'Required';
        }
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
    if (!can) {
      throw new Error(`Missing argument: ${what}.`);
    }
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
    if (!(FIELD_TYPES as readonly string[]).includes(type)) {
      throw new Error(`"${type}" isn't a type: use ${FIELD_TYPES.join(', ')}.`);
    }
  } else {
    need(`the type (${FIELD_TYPES.join(', ')})`);
    type = await pick('Type', [...FIELD_TYPES], { ref: 'foreign key and relation' });
  }

  // Settings each type can't do without.
  if (type === 'enum' && !options.values) {
    if (!can) {
      throw new Error('An enum needs --values, e.g. --values email,phone.');
    }
    options.values = await ask('Values (comma-separated)', { placeholder: 'email,phone' });
  }
  if (type === 'ref') {
    if (!options.to) {
      if (!can) {
        throw new Error('A ref needs --to <resource>.');
      }
      options.to = await pick('Related table', listRefTargets(changes));
    }
    if (!options.relation && can) {
      options.relation = (await pick('Relation', [...RELATIONS], RELATION_HINTS)) as RelationKind;
    }
  }

  if (!wizard) {
    return { resource, name, type: type as FieldType };
  }

  // Type details, with the defaults as initial values.
  if (type === 'string' && options.length === undefined) {
    options.length = await ask('Max length', { initial: '255', validate: positiveInt });
  }
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

  if (type === 'text' && options.editor === undefined) {
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
  }

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
    if (!name) {
      return specs;
    }
    if (specs.some((spec) => spec.name === name) || name === 'id') {
      p.log.warn(`"${name}" is already a field.`);
      continue;
    }
    const options: AddOptions = {};
    const { type } = await askAdd(changes, { resource, name }, options, { always: true });
    specs.push(toSpec(name, type, options));
  }
}

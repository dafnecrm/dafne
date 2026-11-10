import {
  FIELD_TYPES,
  ON_DELETE,
  RELATIONS,
  type FieldSpec,
  type FieldType,
  type OnDelete,
  type RelationKind,
} from './spec.ts';
import { API_TAGS } from '../sync/table.ts';

export interface AddOptions {
  yes?: boolean;
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

const int = (value: string | undefined, flag: string) => {
  if (value === undefined) {
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${flag} must be a positive whole number.`);
  }
  return n;
};

const list = (value: string | undefined) =>
  value
    ?.split(',')
    .map((v) => v.trim())
    .filter(Boolean);

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
  if (spec.editor && spec.type !== 'text') {
    throw new Error('--editor is only for text fields.');
  }
  for (const tag of spec.api) {
    if (!(API_TAGS as readonly string[]).includes(tag)) {
      throw new Error(`Unknown @api tag "${tag}": use ${API_TAGS.join(', ')}.`);
    }
  }
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
  if (!name || !type) {
    throw new Error(`--field "${text}": use ${FIELD_SPEC_HELP}.`);
  }
  if (!(FIELD_TYPES as readonly string[]).includes(type)) {
    throw new Error(`--field "${text}": "${type}" isn't a type; use ${FIELD_TYPES.join(', ')}.`);
  }
  const options: AddOptions = {};
  for (const option of rest) {
    const [key, ...valueParts] = option.split('=');
    const value = valueParts.join('=');
    if ((SPEC_FLAGS as readonly string[]).includes(key) && !valueParts.length) {
      options[key as (typeof SPEC_FLAGS)[number]] = true;
      continue;
    }
    if (!(SPEC_VALUES as readonly string[]).includes(key) || !valueParts.length) {
      throw new Error(`--field "${text}": unknown option "${option}"; use ${FIELD_SPEC_HELP}.`);
    }
    const listValue = value.replace(/\|/g, ',');
    switch (key) {
      case 'values':
      case 'api':
        options[key] = listValue;
        break;
      case 'relation':
        if (!(RELATIONS as readonly string[]).includes(value)) {
          throw new Error(`--field "${text}": relation must be ${RELATIONS.join(', ')}.`);
        }
        options.relation = value as RelationKind;
        break;
      case 'on-delete':
        if (!(ON_DELETE as readonly string[]).includes(value)) {
          throw new Error(`--field "${text}": on-delete must be ${ON_DELETE.join(', ')}.`);
        }
        options.onDelete = value as OnDelete;
        break;
      case 'inverse':
        options.inverse = value === '-' ? false : value;
        break;
      default:
        options[key as 'length' | 'default' | 'precision' | 'scale' | 'to'] = value;
    }
  }
  if (type === 'enum' && !options.values) {
    throw new Error(`--field "${text}": an enum needs values=a|b.`);
  }
  if (type === 'ref' && !options.to) {
    throw new Error(`--field "${text}": a ref needs to=<resource>.`);
  }
  return toSpec(name, type as FieldType, options);
}

/** The `name:type[:option…]` text of a field: the inverse of parseFieldSpec. */
export function formatFieldSpec(spec: FieldSpec): string {
  const parts = [spec.name, spec.type];
  for (const flag of ['required', 'unique', 'index', 'editor'] as const) {
    if (spec[flag]) {
      parts.push(flag);
    }
  }
  const value = (key: string, v: string | number | undefined) => {
    if (v !== undefined && v !== '') {
      parts.push(`${key}=${v}`);
    }
  };
  value('length', spec.length);
  value('values', spec.values?.join('|'));
  value('default', spec.default);
  value('precision', spec.precision);
  value('scale', spec.scale);
  value('api', spec.api.join('|'));
  if (spec.type === 'ref') {
    value('to', spec.to);
    value('relation', spec.relation);
    value('on-delete', spec.onDelete);
    if (spec.inverse !== undefined) {
      value('inverse', spec.inverse === false ? '-' : spec.inverse);
    }
  }
  return parts.join(':');
}

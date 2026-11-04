import { casings, words, type Casings } from '../core/names.ts';

export const FIELD_TYPES = [
  'string',
  'text',
  'int',
  'bigint',
  'float',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'enum',
  'json',
  'ref',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

/**
 * Seen from the table the field is added to:
 * - many-to-one: many rows here point to one row there (FK here);
 * - one-to-one: like many-to-one, with a unique FK;
 * - one-to-many: one row here has many rows there (FK there);
 * - many-to-many: through a junction table.
 */
export const RELATIONS = ['many-to-one', 'one-to-one', 'one-to-many', 'many-to-many'] as const;
export type RelationKind = (typeof RELATIONS)[number];

export const ON_DELETE = ['cascade', 'set null', 'restrict', 'no action'] as const;
export type OnDelete = (typeof ON_DELETE)[number];

export interface FieldSpec {
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  index: boolean;
  length?: number;
  values?: string[];
  precision?: number;
  scale?: number;
  /** Raw default: a number, true/false, "now" for dates, or text. */
  default?: string;
  /** @api tags for the comment above the column. */
  api: string[];
  /** text: the form uses the rich text editor (`@form editor`). */
  editor?: boolean;
  /** Column to insert after (default: before createdAt). */
  after?: string;
  /** ref: the other resource. */
  to?: string;
  relation: RelationKind;
  onDelete?: OnDelete;
  /** ref: name of the relation on the other table; false for none. */
  inverse?: string | false;
}

/** A column name in code (camel) and in SQL (snake). */
export function columnNames(name: string): { key: Casings } {
  return { key: casings(words(name)) };
}

/** Builder call and imports for a plain column. */
export function columnBuilder(spec: FieldSpec, sqlName: string): { code: string; imports: string[] } {
  const q = (v: string) => `'${v.replace(/'/g, "\\'")}'`;
  const name = q(sqlName);
  let code: string;
  let builder: string;
  switch (spec.type) {
    case 'string':
      builder = 'varchar';
      code = `varchar(${name}, { length: ${spec.length ?? 255} })`;
      break;
    case 'text':
      builder = 'text';
      code = `text(${name})`;
      break;
    case 'int':
      builder = 'int';
      code = `int(${name})`;
      break;
    case 'bigint':
      builder = 'bigint';
      code = `bigint(${name}, { mode: 'number' })`;
      break;
    case 'float':
      builder = 'double';
      code = `double(${name})`;
      break;
    case 'decimal':
      builder = 'decimal';
      code = `decimal(${name}, { precision: ${spec.precision ?? 10}, scale: ${spec.scale ?? 2} })`;
      break;
    case 'boolean':
      builder = 'boolean';
      code = `boolean(${name})`;
      break;
    case 'date':
      builder = 'date';
      code = `date(${name})`;
      break;
    case 'datetime':
      builder = 'timestamp';
      code = `timestamp(${name}, { fsp: 3 })`;
      break;
    case 'enum':
      if (!spec.values?.length) throw new Error('An enum needs --values, e.g. --values email,phone.');
      builder = 'mysqlEnum';
      code = `mysqlEnum(${name}, [${spec.values.map(q).join(', ')}])`;
      break;
    case 'json':
      builder = 'json';
      code = `json(${name})`;
      break;
    default:
      throw new Error(`"${spec.type}" isn't a plain column type.`);
  }
  return { code: code + modifiers(spec), imports: [builder] };
}

/** .notNull(), .default(...), .unique() */
export function modifiers(spec: FieldSpec): string {
  let code = '';
  if (spec.required) code += '.notNull()';
  if (spec.default !== undefined) code += defaultCall(spec);
  if (spec.unique) code += '.unique()';
  return code;
}

function defaultCall(spec: FieldSpec): string {
  const value = spec.default!;
  if ((spec.type === 'datetime' || spec.type === 'date') && value === 'now') return '.defaultNow()';
  if (['int', 'bigint', 'float'].includes(spec.type)) {
    if (!/^-?\d+(\.\d+)?$/.test(value)) throw new Error(`--default "${value}" isn't a number.`);
    return `.default(${value})`;
  }
  if (spec.type === 'boolean') {
    if (value !== 'true' && value !== 'false') throw new Error('--default must be true or false.');
    return `.default(${value})`;
  }
  if (spec.type === 'enum' && !spec.values?.includes(value))
    throw new Error(`--default "${value}" isn't one of the --values.`);
  if (spec.type === 'json') return `.default(${value})`;
  return `.default('${value.replace(/'/g, "\\'")}')`;
}

/** The comment above the column, if it has @api or @form tags. */
export function apiComment(spec: FieldSpec): string {
  const tags = [
    ...(spec.api.length ? [`@api ${spec.api.join(' ')}`] : []),
    ...(spec.editor && spec.type === 'text' ? ['@form editor'] : []),
  ];
  return tags.length ? `/** ${tags.join(' ')} */\n` : '';
}

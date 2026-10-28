import pluralize from 'pluralize';
import { casings, words, type ResourceNames } from '../core/names.js';
import type { Column } from './table.js';

/** Where a column appears in the contract. */
export interface Roles {
  body: boolean;
  /** In Listed<S> (and so in Detail too). */
  listed: boolean;
  /** Only in <S>Detail. */
  detail: boolean;
  filter: boolean;
  sort: boolean;
}

const NONE: Roles = { body: false, listed: false, detail: false, filter: false, sort: false };

/** Filled by the service from the session, shown as createdBy/updatedBy. */
const AUDIT = new Set(['createdById', 'updatedById']);
const SENSITIVE = /password|secret|token|hash|salt/i;
const FILTERABLE = new Set(['string', 'text', 'enum', 'boolean']);
const SORTABLE = new Set(['string', 'text', 'int', 'float', 'decimal', 'datetime', 'date', 'enum', 'boolean']);

/**
 * The defaults follow the customers contract; `@api` tags in the table
 * override them.
 */
export function rolesOf(column: Column): Roles {
  const { key, kind, tags } = column;
  if (kind === 'unknown' || tags.has('internal') || AUDIT.has(key)) return NONE;
  if (SENSITIVE.test(key) && !tags.has('writeonly')) return NONE;
  if (key === 'deletedAt') return { ...NONE, detail: true };

  const writeonly = tags.has('writeonly');
  const detailOnly = tags.has('detail');
  const generated = column.primaryKey || column.serverManaged;
  const roles: Roles = {
    body: !generated && !tags.has('readonly'),
    listed: !writeonly && !detailOnly,
    detail: !writeonly && detailOnly,
    filter: FILTERABLE.has(kind) && !generated && !column.references && !writeonly && !detailOnly,
    sort: SORTABLE.has(kind) && !column.primaryKey && !column.references && !writeonly && !detailOnly,
  };
  if (tags.has('filter')) roles.filter = FILTERABLE.has(kind);
  if (tags.has('nofilter')) roles.filter = false;
  if (tags.has('sort')) roles.sort = SORTABLE.has(kind);
  if (tags.has('nosort')) roles.sort = false;
  return roles;
}

/** ACTIVITY_TYPES and ActivityType, for an enum column `type`. */
export function enumNames({ s }: ResourceNames, column: Column) {
  const parts = words(column.key);
  const last = parts[parts.length - 1];
  const plural = casings([...parts.slice(0, -1), pluralize.plural(last)]);
  const singular = casings([...parts.slice(0, -1), pluralize.singular(last)]);
  return {
    constant: `${s.constant}_${plural.constant}`,
    type: `${s.pascal}${singular.pascal}`,
  };
}

const label = (column: Column) => casings(words(column.key)).lower;

/** Zod for the body: required, optional with a default, or nullable. */
export function bodyZod(names: ResourceNames, column: Column): string {
  const required = column.notNull && !column.hasDefault;
  const optionalDefault = column.notNull && column.hasDefault;
  const what = label(column);

  if (column.kind === 'string' || column.kind === 'text') {
    const max = column.length ?? (column.kind === 'text' ? 65535 : 255);
    if (required) return `requiredText(${max}, 'Enter the ${what}')`;
    if (optionalDefault) return `requiredText(${max}, 'Enter the ${what}').optional()`;
    return `optionalText(z.string().max(${max}))`;
  }

  // A form sends "" for an empty date: optionalDate turns it into null.
  if ((column.kind === 'datetime' || column.kind === 'date') && !column.stringMode && !required && !optionalDefault)
    return `optionalDate('Enter a valid date')`;
  if ((column.kind === 'datetime' || column.kind === 'date') && column.stringMode && !required && !optionalDefault)
    return `optionalText(${column.kind === 'date' ? 'z.iso.date' : 'z.iso.datetime'}({ error: 'Enter a valid date' }))`;

  const base = baseZod(names, column, what);
  if (required) return base;
  if (optionalDefault) return `${base}.optional()`;
  // Blank, null or missing all become null, like optionalText.
  return `${base}.nullish().transform((value) => value ?? null)`;
}

function baseZod(names: ResourceNames, column: Column, what: string): string {
  switch (column.kind) {
    case 'int':
      return `z.number({ error: 'Enter the ${what}' }).int()`;
    case 'float':
      return `z.number({ error: 'Enter the ${what}' })`;
    case 'decimal':
      return `z.string().regex(/^-?\\d+(\\.\\d+)?$/, { error: 'Enter a number' })`;
    case 'boolean':
      return 'z.boolean()';
    case 'datetime':
      return column.stringMode ? `z.iso.datetime({ error: 'Enter a valid date' })` : `z.coerce.date({ error: 'Enter a valid date' })`;
    case 'date':
      return column.stringMode ? `z.iso.date({ error: 'Enter a valid date' })` : `z.coerce.date({ error: 'Enter a valid date' })`;
    case 'enum':
      return `z.enum(${enumNames(names, column).constant}, { error: 'Choose the ${what}' })`;
    case 'json':
      return 'z.unknown()';
    default:
      throw new Error(`No Zod type for ${column.key}.`);
  }
}

/** Zod for the list's query string (each filter is a param of its own). */
export function filterZod(names: ResourceNames, column: Column): string {
  if (column.kind === 'enum') return `z.enum(${enumNames(names, column).constant}).optional()`;
  if (column.kind === 'boolean') return `z.enum(['true', 'false']).optional()`;
  return `z.string().max(${column.length ?? 255}).optional()`;
}

/** TypeScript type of the column in responses. */
export function responseType(names: ResourceNames, column: Column): string {
  const base = (() => {
    switch (column.kind) {
      case 'int':
      case 'float':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'datetime':
      case 'date':
        return column.stringMode ? 'string' : 'Date';
      case 'enum':
        return enumNames(names, column).type;
      case 'json':
        return 'unknown';
      default:
        return 'string';
    }
  })();
  return column.notNull ? base : `${base} | null`;
}

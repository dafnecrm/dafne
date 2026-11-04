import pluralize from 'pluralize';
import { casings, words, type ResourceNames } from '../core/names.ts';
import type { Column } from './table.ts';

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

/** A message key of the contracts' catalog, e.g. msg('invoices.name.required'). */
const msgKey = (names: ResourceNames, column: Column, rule: 'required' | 'invalid') =>
  `msg('${names.p.camel}.${column.key}.${rule}')`;
const DATE_INVALID = "msg('common.date.invalid')";
const NUMBER_INVALID = "msg('common.number.invalid')";

/** Zod for the body: required, optional with a default, or nullable. */
export function bodyZod(names: ResourceNames, column: Column): string {
  const required = column.notNull && !column.hasDefault;
  const optionalDefault = column.notNull && column.hasDefault;
  const required_ = msgKey(names, column, 'required');

  if (column.kind === 'string' || column.kind === 'text') {
    const max = column.length ?? (column.kind === 'text' ? 65535 : 255);
    if (required) return `requiredText(${max}, ${required_})`;
    if (optionalDefault) return `requiredText(${max}, ${required_}).optional()`;
    return `optionalText(z.string().max(${max}))`;
  }

  // A form sends "" for an empty date: optionalDate turns it into null.
  if ((column.kind === 'datetime' || column.kind === 'date') && !column.stringMode && !required && !optionalDefault)
    return `optionalDate(${DATE_INVALID})`;
  if ((column.kind === 'datetime' || column.kind === 'date') && column.stringMode && !required && !optionalDefault)
    return `optionalText(${column.kind === 'date' ? 'z.iso.date' : 'z.iso.datetime'}({ error: ${DATE_INVALID} }))`;

  const base = baseZod(names, column, required_);
  if (required) return base;
  if (optionalDefault) return `${base}.optional()`;
  // Blank, null or missing all become null, like optionalText.
  return `${base}.nullish().transform((value) => value ?? null)`;
}

function baseZod(names: ResourceNames, column: Column, required: string): string {
  switch (column.kind) {
    case 'int':
      return `z.number({ error: ${required} }).int()`;
    case 'float':
      return `z.number({ error: ${required} })`;
    case 'decimal':
      return `z.string().regex(/^-?\\d+(\\.\\d+)?$/, { error: ${NUMBER_INVALID} })`;
    case 'boolean':
      return 'z.boolean()';
    case 'datetime':
      return column.stringMode ? `z.iso.datetime({ error: ${DATE_INVALID} })` : `z.coerce.date({ error: ${DATE_INVALID} })`;
    case 'date':
      return column.stringMode ? `z.iso.date({ error: ${DATE_INVALID} })` : `z.coerce.date({ error: ${DATE_INVALID} })`;
    case 'enum':
      return `z.enum(${enumNames(names, column).constant}, { error: ${required} })`;
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

/*
 * The primary key of a new resource: `serial` (the default), `uuid` or
 * `varchar` (with a length). The table, contract, service, controller and
 * specs the backend templates render follow it.
 */

export const ID_TYPES = ['serial', 'uuid', 'varchar'] as const;
export type IdType = (typeof ID_TYPES)[number];

export const DEFAULT_ID_LENGTH = 36;
/** Below this, random hex ids of that length start to collide. */
const SAFE_ID_LENGTH = 16;

export interface IdSpec {
  type: IdType;
  /** varchar only. */
  length?: number;
}

export const SERIAL_ID: IdSpec = { type: 'serial' };

/** Checks `--idType`/`--idLength` and fills in the default length. */
export function idSpec(type: string | undefined = 'serial', length?: number): IdSpec {
  if (!(ID_TYPES as readonly string[]).includes(type))
    throw new Error(`The id type "${type}" isn't one of: ${ID_TYPES.join(', ')}.`);
  if (type !== 'varchar') {
    if (length !== undefined) throw new Error('--idLength is only for a varchar id.');
    return { type: type as IdType };
  }
  const value = length ?? DEFAULT_ID_LENGTH;
  if (!Number.isInteger(value) || value < 1 || value > 255) throw new Error('The id length must be a whole number from 1 to 255.');
  return { type: 'varchar', length: value };
}

/** A warning about the id, if any (a varchar too short for random ids). */
export function idWarning(id: IdSpec): string | undefined {
  if (id.type === 'varchar' && id.length! < SAFE_ID_LENGTH)
    return `A varchar(${id.length}) id holds a random hex id of ${id.length} characters, which can collide: change its $defaultFn if you need another scheme.`;
  return undefined;
}

/** What the backend templates write for the id (`id` in their data). */
export interface IdTemplate {
  type: IdType;
  /** The TypeScript type of the id: number or string. */
  ts: 'number' | 'string';
  /** pg-core builder to import in the table file. */
  builder: string;
  /** The column, e.g. `serial('id').primaryKey()`. */
  column: string;
  /** `import ...` lines the table file needs besides pg-core, if any. */
  tableImports: string[];
  /** The `:id` pipe of the controller, and the import from @dafne/backend-common. */
  pipe: string;
  pipeImport: string;
  /** Zod of the `id` filter in the list's query string. */
  filterZod: string;
  /** The filter value the service compares with the id. */
  filterValue: string;
  /** A comment on who picks the id of a new record. */
  createComment: string;
  /** Sample ids for the specs, as code: an existing one and a missing one. */
  sample: string;
  missing: string;
}

const UUID_REGEX = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

export function idTemplate(id: IdSpec = SERIAL_ID): IdTemplate {
  switch (id.type) {
    case 'serial':
      return {
        type: 'serial',
        ts: 'number',
        builder: 'serial',
        column: "serial('id').primaryKey()",
        tableImports: [],
        pipe: 'IdPipe',
        pipeImport: 'IdPipe',
        filterZod: 'z.string().regex(/^\\s*\\d{0,9}\\s*$/).optional()',
        filterValue: 'Number(value)',
        createComment: 'The id is serial: the database picks it.',
        sample: '1',
        missing: '999',
      };
    case 'uuid':
      return {
        type: 'uuid',
        ts: 'string',
        builder: 'uuid',
        column: "uuid('id').primaryKey().defaultRandom()",
        tableImports: [],
        pipe: 'UuidPipe',
        pipeImport: 'UuidPipe',
        filterZod: `z.string().regex(/^\\s*(${UUID_REGEX})?\\s*$/).optional()`,
        filterValue: 'value',
        createComment: 'The id is a random uuid: the database picks it.',
        sample: "'00000000-0000-4000-8000-000000000001'",
        missing: "'00000000-0000-4000-8000-000000000999'",
      };
    case 'varchar': {
      const length = id.length ?? DEFAULT_ID_LENGTH;
      const random = length >= 36 ? 'randomUUID()' : `randomUUID().replaceAll('-', '').slice(0, ${length})`;
      return {
        type: 'varchar',
        ts: 'string',
        builder: 'varchar',
        column: `varchar('id', { length: ${length} }).primaryKey().$defaultFn(() => ${random})`,
        tableImports: ["import { randomUUID } from 'node:crypto';"],
        pipe: `new TextIdPipe(${length})`,
        pipeImport: 'TextIdPipe',
        filterZod: `z.string().max(${length}).optional()`,
        filterValue: 'value',
        createComment: 'The id is random: Drizzle picks it ($defaultFn).',
        sample: "'id-1'",
        missing: "'id-999'",
      };
    }
  }
}

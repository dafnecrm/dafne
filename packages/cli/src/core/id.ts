/*
 * The primary key of a new resource: `serial` (the default) or `uuid`,
 * picked by the database, or `varchar` (with a length), a code the client
 * picks: it's in the body, set on create (409 when taken) and never
 * changed. The table, contract, service, controller and specs the backend
 * templates render follow it.
 */

export const ID_TYPES = ['serial', 'uuid', 'varchar'] as const;
export type IdType = (typeof ID_TYPES)[number];

export const DEFAULT_ID_LENGTH = 36;

export interface IdSpec {
  type: IdType;
  /** varchar only. */
  length?: number;
}

export const SERIAL_ID: IdSpec = { type: 'serial' };

/** Checks `--idType`/`--idLength` and fills in the default length. */
export function idSpec(type: string | undefined = 'serial', length?: number): IdSpec {
  if (!(ID_TYPES as readonly string[]).includes(type)) {
    throw new Error(`The id type "${type}" isn't one of: ${ID_TYPES.join(', ')}.`);
  }
  if (type !== 'varchar') {
    if (length !== undefined) {
      throw new Error('--idLength is only for a varchar id.');
    }
    return { type: type as IdType };
  }
  const value = length ?? DEFAULT_ID_LENGTH;
  if (!Number.isInteger(value) || value < 1 || value > 255) {
    throw new Error('The id length must be a whole number from 1 to 255.');
  }
  return { type: 'varchar', length: value };
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
  /** How the service turns the `id` query param into the id (EXACT_FILTERS). */
  filterParse: 'Number' | 'String';
  /** A comment on who picks the id of a new record. */
  createComment: string;
  /** The client picks the id (in the body): a taken one is a 409. */
  clientPicks: boolean;
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
        filterParse: 'Number',
        createComment: 'The id is serial: the database picks it.',
        clientPicks: false,
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
        filterParse: 'String',
        createComment: 'The id is a random uuid: the database picks it.',
        clientPicks: false,
        sample: "'00000000-0000-4000-8000-000000000001'",
        missing: "'00000000-0000-4000-8000-000000000999'",
      };
    case 'varchar': {
      const length = id.length ?? DEFAULT_ID_LENGTH;
      return {
        type: 'varchar',
        ts: 'string',
        builder: 'varchar',
        // No default: the client picks it, so the contract puts it in the body.
        column: `varchar('id', { length: ${length} }).primaryKey()`,
        tableImports: [],
        pipe: `new TextIdPipe(${length})`,
        pipeImport: 'TextIdPipe',
        filterZod: `z.string().max(${length}).optional()`,
        filterParse: 'String',
        createComment: "The id is the body's: the client picks it (409 when taken).",
        clientPicks: true,
        sample: "'id-1'",
        missing: "'id-999'",
      };
    }
  }
}

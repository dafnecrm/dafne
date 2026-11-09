import type { Tree } from '@nx/devkit';
import { idSpec, idWarning } from '../../core/id.ts';
import { resourceNames } from '../../core/names.ts';
import { DEFAULT_APP } from '../../core/workspace.ts';
import { addField } from '../../fields/operations.ts';
import { parseFieldSpec } from '../../fields/parse.ts';
import { BACKEND_RESOURCE, backendPieces, tableFile } from '../../pieces/backend.ts';
import { generatePieces } from '../../pieces/pieces.ts';
import { syncOne } from '../../sync/resource.ts';
import { resourceMessages, syncMessages } from '../../wiring/messages.ts';
import { runGenerator } from '../run.ts';

export interface BackendResourceSchema {
  name: string;
  /** Fields of the new table, as `name:type[:option…]` (see fields/parse.ts). */
  fields?: string[];
  /** The primary key: serial (default), uuid or varchar. */
  idType?: string;
  /** Length of a varchar id (default 36). */
  idLength?: number;
  app?: string;
  force?: boolean;
}

/**
 * A whole backend resource: contract, Drizzle table, Nest lib with service
 * and controller. The fields go into the new table before anything is
 * written; then the contract, the service and their specs are synced with
 * them. The table starts with only its `id` (serial, uuid or varchar, see
 * core/id.ts) and the audit columns.
 */
export default async function backendResourceGenerator(tree: Tree, options: BackendResourceSchema) {
  return runGenerator(tree, options, async (changes) => {
    const names = resourceNames(options.name);
    const fields = (options.fields ?? []).map(parseFieldSpec);
    const id = idSpec(options.idType, options.idLength);
    if (changes.exists(tableFile(names)) && !options.force)
      throw new Error(`${tableFile(names)} already exists: the resource "${names.p.kebab}" is there already.`);

    generatePieces(backendPieces, BACKEND_RESOURCE, { changes, names, app: options.app ?? DEFAULT_APP, id });
    const warning = idWarning(id);
    if (warning) changes.warn(warning);

    for (const spec of fields)
      for (const note of addField(changes, names.p.kebab, spec).notes)
        // The table is new: it has no rows a NOT NULL column could break.
        if (!note.includes('already has rows')) changes.warn(note);
    if (fields.length) {
      const report = await syncOne(changes, names.p.kebab);
      for (const warning of report.warnings) changes.warn(warning);
      for (const key of report.unknown) changes.warn(`contract: ${key} isn't a column.`);
    }

    syncMessages(changes, { contracts: resourceMessages(names).contracts });

    return {
      next: [
        'pnpm install   # links the new package',
        'pnpm nx sync   # TypeScript project references',
        ...(fields.length ? [] : ['Add the real fields to the table, then:']),
        `pnpm dafne db generate --name add-${names.s.kebab}   # the table migration`,
        `pnpm dafne test ${'@dafne/backend-' + names.p.kebab}`,
      ],
    };
  });
}

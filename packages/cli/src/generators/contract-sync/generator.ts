import { logger, type Tree } from '@nx/devkit';
import type { Changes } from '../../core/changes.ts';
import { resourceNames } from '../../core/names.ts';
import { backendLib } from '../../core/workspace.ts';
import { contractFile } from '../../pieces/backend.ts';
import { syncOne } from '../../sync/resource.ts';
import { syncMessages } from '../../wiring/messages.ts';
import { runGenerator } from '../run.ts';

export interface ContractSyncSchema {
  /** Resource name, singular or plural (e.g. orders). */
  name?: string;
  /** Every table that has a contract. */
  all?: boolean;
  /** Also sync the service's queries and its spec (default true). */
  service?: boolean;
}

const TABLES = `${backendLib('database')}/src/tables`;

/** Resources with both a table file (tables/<plural>.ts) and a contract. */
export function syncableContracts(changes: Changes): string[] {
  return changes
    .list(TABLES)
    .filter((file) => /^[a-z0-9-]+\.ts$/.test(file))
    .map((file) => file.replace(/\.ts$/, ''))
    .filter((name) => changes.exists(contractFile(resourceNames(name))));
}

/**
 * Syncs a resource's contract with its table (`syncOne`): the body schema,
 * sort and filter fields, list query and response types; then the
 * service's queries and the specs' sample bodies. It edits, it doesn't
 * regenerate: hand-written validation and non-column members stay.
 */
export default async function contractSyncGenerator(tree: Tree, options: ContractSyncSchema) {
  return runGenerator(tree, {}, async (changes) => {
    let resources: string[];
    if (options.all) {
      resources = syncableContracts(changes);
      if (!resources.length) {
        throw new Error('No table has a contract to sync.');
      }
    } else if (options.name) {
      resources = [resourceNames(options.name).p.kebab];
    } else {
      throw new Error('Missing argument: the resource (e.g. orders), or --all.');
    }

    const required: string[] = [];
    const synced: string[] = [];
    for (const resource of resources) {
      let report;
      const undo = changes.checkpoint();
      try {
        report = await syncOne(changes, resource, [], { service: options.service ?? true });
      } catch (error) {
        // With --all, a contract the sync can't read (e.g. no body schema) is
        // skipped, with what the sync already changed for it.
        if (!options.all) {
          throw error;
        }
        undo();
        changes.warn(`${resource}: skipped: ${(error as Error).message}`);
        continue;
      }
      synced.push(resource);
      for (const warning of report.warnings) {
        changes.warn(warning);
      }
      for (const key of report.unknown) {
        changes.warn(`contract ${resource}: ${key} isn't a column of the table: kept. Remove it if the column was dropped.`);
      }
      for (const item of report.added) {
        logger.info(`+ ${resource}: ${item}`);
      }
      for (const item of report.removed) {
        logger.info(`- ${resource}: ${item}`);
      }
      required.push(...report.required.map((key) => `${resource}.${key}`));
    }
    syncMessages(changes);
    if (required.length) {
      changes.warn(`New required body fields: ${required.join(', ')}: the forms and tests must send them.`);
    }

    if (!synced.length) {
      return { next: [] };
    }
    return {
      next: [
        `pnpm dafne test ${synced.map((r) => `@dafne/backend-${r}`).join(' ')} @dafne/contracts`,
        ...synced.map((r) => `pnpm dafne sync frontend-resource ${r}   # the pages`),
      ],
    };
  });
}

import type { Tree } from '@nx/devkit';
import { casings, resourceNames, words } from '../../core/names.ts';
import { removeField } from '../../fields/operations.ts';
import { contractFile } from '../../pieces/backend.ts';
import { syncDropped } from '../../sync/dropped.ts';
import { syncOne } from '../../sync/resource.ts';
import { pruneContractMessages } from '../../wiring/messages.ts';
import { runGenerator } from '../run.ts';

export interface RemoveBackendDbColumnSchema {
  /** The table, by resource name (e.g. orders). */
  name: string;
  /** Columns or relations to remove. */
  columns: string[];
  /** The migration is generated right after: not a next step. */
  migration?: boolean;
}

/**
 * Removes columns from a table (with their indexes and relations, see
 * `removeField`), then syncs the contract, the service and their specs of
 * every resource whose table changed: what came from those columns goes.
 * The migration is left to `dafne db generate`.
 */
export default async function removeBackendDbColumnGenerator(tree: Tree, options: RemoveBackendDbColumnSchema) {
  return runGenerator(tree, {}, async (changes) => {
    const names = resourceNames(options.name);
    const columns = [...new Set(options.columns ?? [])];
    if (!columns.length) throw new Error('No column to remove: pass --columns.');

    const touched = new Set<string>();
    const dropped: Record<string, string[]> = {};
    for (const column of columns) {
      const result = removeField(changes, names.p.kebab, column);
      for (const note of result.notes) changes.warn(note);
      for (const resource of result.touched) touched.add(resource);
      for (const [resource, keys] of Object.entries(result.dropped)) (dropped[resource] ??= []).push(...keys);
    }

    for (const resource of touched) {
      if (!changes.exists(contractFile(resourceNames(resource)))) {
        changes.warn(`${resource}: no contract, nothing to sync.`);
        continue;
      }
      const report = await syncOne(changes, resource, dropped[resource] ?? []);
      for (const warning of report.warnings) changes.warn(warning);
      for (const key of report.unknown) changes.warn(`contract ${resource}: ${key} isn't a column: kept.`);
      syncDropped(changes, resourceNames(resource), dropped[resource] ?? []);
    }
    pruneContractMessages(changes);

    const resources = [...touched];
    return {
      next: [
        ...(options.migration ? [] : [`pnpm dafne db generate --name ${migrationName(names.s.kebab, columns)}   # the migration`]),
        `pnpm dafne test ${resources.map((r) => `@dafne/backend-${r}`).join(' ')} @dafne/contracts`,
        ...resources.map((r) => `pnpm dafne sync frontend-resource ${r}   # the pages`),
      ],
    };
  });
}

/** drop-order-name, drop-order-name-notes… */
export const migrationName = (singular: string, columns: string[]) =>
  `drop-${singular}-${columns.map((c) => casings(words(c)).kebab).join('-')}`.slice(0, 60);

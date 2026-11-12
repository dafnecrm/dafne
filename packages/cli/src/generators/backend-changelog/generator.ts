import type { Tree } from '@nx/devkit';
import { resourceNames } from '../../core/names.ts';
import { DEFAULT_APP } from '../../core/workspace.ts';
import { addChangelog, partitionTable } from '../../wiring/changelog.ts';
import { runGenerator } from '../run.ts';

export interface BackendChangelogSchema {
  name: string;
  /** A partition of changelog.change of its own (a migration of @dafne/backend-database-changelog). */
  partition?: boolean;
  app?: string;
  force?: boolean;
}

/**
 * Turns on the change log of an existing resource (see wiring/changelog.ts):
 * the logged fields, the module's forFeature, GET :id/changes. With
 * `partition`, the migration of its own partition. Run again with
 * `partition` on a logged resource, it only adds the partition.
 */
export default async function backendChangelogGenerator(tree: Tree, options: BackendChangelogSchema) {
  return runGenerator(tree, options, (changes) => {
    const names = resourceNames(options.name);
    const { migration } = addChangelog(changes, names, {
      partition: options.partition,
      app: options.app ?? DEFAULT_APP,
      input: options.name,
    });
    return {
      next: [
        'pnpm install   # links @dafne/backend-changelog',
        'pnpm nx sync   # TypeScript project references',
        ...(migration ? [`pnpm dafne db migrate   # creates changelog.${partitionTable(names)} (${migration})`] : []),
        `Check the logged fields in ${names.s.kebab}.changelog.ts (map: how a field is logged)`,
      ],
    };
  });
}

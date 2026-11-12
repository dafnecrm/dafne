import type { Tree } from '@nx/devkit';
import { resourceNames } from '../../core/names.ts';
import { logger } from '@nx/devkit';
import { DEFAULT_APP, DEFAULT_FRONTEND_APP } from '../../core/workspace.ts';
import { historyOfPages } from '../../sync/history.ts';
import { addChangelog, partitionTable } from '../../wiring/changelog.ts';
import { syncMessages } from '../../wiring/messages.ts';
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
 * `partition` on a logged resource, it only adds the partition. When the
 * resource has pages already (in the default frontend app or a lib), they get its
 * history (`historyOfPages`; pages in another frontend app get it from
 * `sync frontend-resource --app`).
 */
export default async function backendChangelogGenerator(tree: Tree, options: BackendChangelogSchema) {
  return runGenerator(tree, options, (changes) => {
    const names = resourceNames(options.name);
    const { migration } = addChangelog(changes, names, {
      partition: options.partition,
      app: options.app ?? DEFAULT_APP,
      input: options.name,
    });
    const history = historyOfPages(changes, names, { app: DEFAULT_FRONTEND_APP });
    if (history.length) {
      syncMessages(changes, { app: DEFAULT_FRONTEND_APP });
      for (const item of history) {
        logger.info(`+ ${item}`);
      }
    }
    return {
      next: [
        'pnpm install   # links @dafne/backend-changelog',
        ...(history.length ? ['Check the history sheet: how each logged field shows (value, summary)'] : []),
        'pnpm nx sync   # TypeScript project references',
        ...(migration ? [`pnpm dafne db migrate   # creates changelog.${partitionTable(names)} (${migration})`] : []),
        `Check the logged fields in ${names.s.kebab}.changelog.ts (map: how a field is logged)`,
      ],
    };
  });
}

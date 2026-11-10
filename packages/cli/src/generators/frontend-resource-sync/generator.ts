import { logger, type Tree } from '@nx/devkit';
import { resourceNames } from '../../core/names.ts';
import { DEFAULT_FRONTEND_APP } from '../../core/workspace.ts';
import { syncResourcePages, warnReports } from '../../sync/frontend.ts';
import { pruneFrontendMessages, syncMessages } from '../../wiring/messages.ts';
import { resolveTarget } from '../frontend-pieces.ts';
import { runGenerator } from '../run.ts';

export interface FrontendResourceSyncSchema {
  /** Resource name, singular or plural (e.g. orders). */
  name: string;
  /** Frontend app of the pages (apps/<app>). */
  app?: string;
  /** Frontend lib the resource is in (packages/frontend/<lib>); found when left out. */
  lib?: string;
  /** Only add: keep what the contract dropped. */
  keep?: boolean;
}

/**
 * Syncs the pages of a resource with its contract: the form gets the body's
 * fields, the list and the detail the response's; what the contract no
 * longer has is removed (unless `keep`), with the message keys only it used.
 * Reads of dropped fields elsewhere (titles, dialogs…) are reported.
 */
export default async function frontendResourceSyncGenerator(tree: Tree, options: FrontendResourceSyncSchema) {
  return runGenerator(tree, {}, (changes) => {
    const names = resourceNames(options.name);
    const app = options.app ?? DEFAULT_FRONTEND_APP;
    // Where the pages are (the lib given, or found; the app by default).
    const target = resolveTarget(changes, names, { app, lib: options.lib });
    const { reports, skipped, leftovers } = syncResourcePages(changes, names, target, { prune: !options.keep });

    warnReports(changes, reports);
    if (skipped.length) {
      changes.warn(`${names.p.kebab}: no ${skipped.join(', ')} page; skipped.`);
    }
    for (const leftover of leftovers) {
      changes.warn(`${leftover}: not in the contract any more: fix it by hand.`);
    }
    syncMessages(changes, { app });
    const prunedKeys = pruneFrontendMessages(changes, app);

    for (const [path, report] of reports) {
      for (const item of report.added) {
        logger.info(`+ ${path}: ${item}`);
      }
      for (const item of report.removed ?? []) {
        logger.info(`- ${path}: ${item}`);
      }
    }
    if (prunedKeys.length) {
      logger.info(`- messages: ${prunedKeys.join(', ')}`);
    }

    return {
      next: [
        ...(leftovers.length ? ['Fix the reads of the dropped fields listed above.'] : []),
        'Check the new inputs, columns and details: their place, labels and defaults.',
        `pnpm dafne typecheck ${target.kind === 'lib' ? `@dafne/frontend-${target.lib} ` : ''}@dafne/${app}`,
      ],
    };
  });
}

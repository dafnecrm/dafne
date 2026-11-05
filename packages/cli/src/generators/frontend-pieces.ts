import type { Tree } from '@nx/devkit';
import { resourceNames } from '../core/names.ts';
import { DEFAULT_FRONTEND_APP } from '../core/workspace.ts';
import { FRONTEND_RESOURCE, frontendOptions, frontendPieces, type FrontendOptions } from '../pieces/frontend.ts';
import { generatePieces } from '../pieces/pieces.ts';
import { dataFiles } from '../sync/frontend.ts';
import { resourceMessages, syncMessages } from '../wiring/messages.ts';
import { runGenerator } from './run.ts';

export interface FrontendPieceSchema extends Partial<FrontendOptions> {
  /** Resource name, singular or plural (e.g. invoice). */
  name: string;
  /** Frontend app the pages go into (apps/<app>). */
  app?: string;
  force?: boolean;
}

/**
 * Generates frontend pieces of a resource in apps/<app> (`FRONTEND_RESOURCE`
 * for the whole resource), plus the missing pieces they depend on. The
 * pages are synced with the contract's fields, and their message keys
 * added to the app's catalogs.
 */
export function generateFrontendPieces(tree: Tree, options: FrontendPieceSchema, pieces: string[]) {
  return runGenerator(tree, options, (changes) => {
    const names = resourceNames(options.name);
    const app = options.app ?? DEFAULT_FRONTEND_APP;
    const whole = pieces === FRONTEND_RESOURCE;
    if (whole && changes.exists(dataFiles(names, app).lib) && !options.force)
      throw new Error(`${dataFiles(names, app).lib} already exists: the pages of "${names.p.kebab}" are there already.`);

    const ctx = { changes, names, app, options: frontendOptions(options) };
    const dependencies = generatePieces(frontendPieces, pieces, ctx);
    const pages = [...pieces, ...dependencies].some((piece) => piece !== 'nav');
    syncMessages(changes, { frontend: pages ? resourceMessages(names).frontend : undefined, app });

    return {
      dependencies: dependencies.map((piece) => `frontend-${piece}`),
      next: [`pnpm dafne typecheck @dafne/${app}   # also generates the PageProps types of new routes`],
    };
  });
}

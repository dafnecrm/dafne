import type { Tree } from '@nx/devkit';
import type { Changes } from '../core/changes.ts';
import { appTarget, findFrontendTarget, libName, libTarget, type FrontendTarget } from '../core/frontend-target.ts';
import { resourceNames, type ResourceNames } from '../core/names.ts';
import { DEFAULT_FRONTEND_APP, frontendLib } from '../core/workspace.ts';
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
  /** Frontend lib (packages/frontend/<lib>) the code goes into; the route pages stay in the app. */
  lib?: string;
  force?: boolean;
}

/**
 * Where the code goes: the lib given (created if missing), else where the
 * resource already is (its data module), else the app.
 */
export function resolveTarget(changes: Changes, names: ResourceNames, options: { app?: string; lib?: string }): FrontendTarget {
  const app = options.app ?? DEFAULT_FRONTEND_APP;
  const found = findFrontendTarget(changes, names, app);
  if (!options.lib) return found ?? appTarget(app);
  const lib = libName(options.lib);
  if (found?.kind === 'lib' && found.lib === lib) return found;
  if (found) {
    const where = found.kind === 'app' ? `apps/${app}` : frontendLib(found.lib);
    throw new Error(`The frontend of "${names.p.kebab}" is in ${where} already: generate its parts there (leave out --lib).`);
  }
  return libTarget(names, lib, app);
}

/**
 * Generates frontend pieces of a resource (`FRONTEND_RESOURCE` for the
 * whole resource), plus the missing pieces they depend on, in apps/<app>
 * or in a lib (`lib`, or the one the resource is in already). The pages
 * are synced with the contract's fields, and their message keys added to
 * the catalogs (the app's, or the lib's for the resource's own texts).
 */
export function generateFrontendPieces(tree: Tree, options: FrontendPieceSchema, pieces: string[]) {
  return runGenerator(tree, options, (changes) => {
    const names = resourceNames(options.name);
    const app = options.app ?? DEFAULT_FRONTEND_APP;
    const target = resolveTarget(changes, names, options);
    const whole = pieces === FRONTEND_RESOURCE;
    const { lib: data } = dataFiles(names, target);
    if (whole && changes.exists(data) && !options.force)
      throw new Error(`${data} already exists: the pages of "${names.p.kebab}" are there already.`);
    const newLib = target.kind === 'lib' && !changes.exists(`${frontendLib(target.lib)}/package.json`);

    const ctx = { changes, names, app, target, options: frontendOptions(options) };
    const dependencies = generatePieces(frontendPieces, pieces, ctx);
    const pages = [...pieces, ...dependencies].some((piece) => piece !== 'nav');
    syncMessages(changes, { frontend: pages ? resourceMessages(names).frontend : undefined, app });

    const typecheck = target.kind === 'lib' ? `@dafne/frontend-${target.lib} @dafne/${app}` : `@dafne/${app}`;
    return {
      dependencies: dependencies.map((piece) => `frontend-${piece}`),
      next: [
        ...(newLib ? ['pnpm install   # links the new package'] : []),
        ...(target.kind === 'lib' ? ['pnpm nx sync   # TypeScript project references of the lib'] : []),
        `pnpm dafne typecheck ${typecheck}   # also generates the PageProps types of new routes`,
      ],
    };
  });
}

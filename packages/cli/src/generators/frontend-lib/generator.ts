import type { Tree } from '@nx/devkit';
import { libName } from '../../core/frontend-target.ts';
import { DEFAULT_FRONTEND_APP, frontendPackage } from '../../core/workspace.ts';
import { createFrontendLib } from '../../wiring/frontend.ts';
import { runGenerator } from '../run.ts';

export interface FrontendLibSchema {
  name: string;
  /** Frontend app the lib is registered in (apps/<app>). */
  app?: string;
  force?: boolean;
}

/**
 * An empty frontend lib, `@dafne/frontend-<name>` in packages/frontend/<name>
 * (TypeScript sources, compiled by Next), registered in a frontend app. The
 * name is used as it is (not pluralized).
 */
export default async function frontendLibGenerator(tree: Tree, options: FrontendLibSchema) {
  return runGenerator(tree, options, (changes) => {
    const lib = libName(options.name);
    const app = options.app ?? DEFAULT_FRONTEND_APP;
    createFrontendLib(changes, lib, app);
    return {
      next: [
        'pnpm install   # links the new package',
        'pnpm nx sync   # TypeScript project references',
        `pnpm dafne typecheck ${frontendPackage(lib)} @dafne/${app}`,
      ],
    };
  });
}

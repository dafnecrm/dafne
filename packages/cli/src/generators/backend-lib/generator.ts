import type { Tree } from '@nx/devkit';
import { casings, words } from '../../core/names.ts';
import { backendPackage, DEFAULT_APP } from '../../core/workspace.ts';
import { backendPieces } from '../../pieces/backend.ts';
import { runGenerator } from '../run.ts';

export interface BackendLibSchema {
  name: string;
  app?: string;
  force?: boolean;
}

/**
 * An empty Nest lib, `@dafne/backend-<name>` in packages/backend/<name>,
 * registered in a backend app. The name is used as it is (not pluralized).
 */
export default async function backendLibGenerator(tree: Tree, options: BackendLibSchema) {
  return runGenerator(tree, options, (changes) => {
    const parts = words(options.name);
    if (!parts.length || !/^[a-z]/.test(parts[0])) throw new Error(`"${options.name}" must start with a letter.`);
    const name = casings(parts);
    backendPieces.lib.generate({ changes, names: { s: name, p: name }, app: options.app ?? DEFAULT_APP });
    return {
      next: [
        'pnpm install   # links the new package',
        'pnpm nx sync   # TypeScript project references',
        `pnpm dafne test ${backendPackage(name.kebab)}`,
      ],
    };
  });
}

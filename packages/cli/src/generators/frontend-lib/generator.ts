import type { Tree } from '@nx/devkit';
import { casings, words } from '../../core/names.ts';
import { render } from '../../core/templates.ts';
import { frontendLib, frontendPackage } from '../../core/workspace.ts';
import { wireFrontendLib } from '../../wiring/frontend.ts';
import { runGenerator } from '../run.ts';

export interface FrontendLibSchema {
  name: string;
  force?: boolean;
}

const FILES = ['package.json', 'tsconfig.json', 'vitest.config.ts', 'eslint.config.mjs', 'src/index.ts'];

/**
 * An empty frontend lib, `@dafne/frontend-<name>` in packages/frontend/<name>
 * (TypeScript sources, compiled by Next), registered in apps/sales-web. The
 * name is used as it is (not pluralized).
 */
export default async function frontendLibGenerator(tree: Tree, options: FrontendLibSchema) {
  return runGenerator(tree, options, (changes) => {
    const parts = words(options.name);
    if (!parts.length || !/^[a-z]/.test(parts[0])) throw new Error(`"${options.name}" must start with a letter.`);
    const l = casings(parts);
    const dir = frontendLib(l.kebab);
    for (const file of FILES) changes.create(`${dir}/${file}`, render(`frontend-lib/${file}`, { l }));
    wireFrontendLib(changes, l.kebab);
    return {
      next: [
        'pnpm install   # links the new package',
        'pnpm nx sync   # TypeScript project references',
        `pnpm dafne typecheck ${frontendPackage(l.kebab)} @dafne/sales-web`,
      ],
    };
  });
}

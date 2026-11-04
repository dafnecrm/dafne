import type { Tree } from '@nx/devkit';
import { casings, words } from '../../core/names.ts';
import { render } from '../../core/templates.ts';
import { appModule, appPackage, backendApp } from '../../core/workspace.ts';
import { ensureReference } from '../../wiring/backend.ts';
import { runGenerator } from '../run.ts';

export interface BackendAppSchema {
  name: string;
  /** Default port of `nest start` (PORT overrides it). */
  port?: number;
  force?: boolean;
}

/** Template → path in the app (dotfiles are kept without the dot in templates/). */
const FILES: Record<string, (app: string) => string> = {
  'package.json': () => 'package.json',
  'nest-cli.json': () => 'nest-cli.json',
  'tsconfig.json': () => 'tsconfig.json',
  'tsconfig.build.json': () => 'tsconfig.build.json',
  'rspack.config.js': () => 'rspack.config.js',
  'vitest.config.ts': () => 'vitest.config.ts',
  prettierrc: () => '.prettierrc',
  'oxlintrc.json': () => '.oxlintrc.json',
  gitignore: () => '.gitignore',
  'src/main.ts': () => 'src/main.ts',
  'src/controller.ts': (app) => `src/${app}.controller.ts`,
  'src/controller.spec.ts': (app) => `src/${app}.controller.spec.ts`,
};

/**
 * A NestJS app in apps/<name>, built like apps/api (nest + rspack, vitest
 * with SWC, oxlint) but empty: a root module with a health controller.
 * Backend libs are added with `dafne g lib|resource ... --app <name>`.
 */
export default async function backendAppGenerator(tree: Tree, options: BackendAppSchema) {
  return runGenerator(tree, options, (changes) => {
    const parts = words(options.name);
    if (!parts.length || !/^[a-z]/.test(parts[0])) throw new Error(`"${options.name}" must start with a letter.`);
    const a = casings(parts);
    const dir = backendApp(a.kebab);
    const data = { a, port: options.port ?? 3001 };
    for (const [template, path] of Object.entries(FILES))
      changes.create(`${dir}/${path(a.kebab)}`, render(`app/${template}`, data));
    changes.create(appModule(a.kebab), render('app/src/module.ts', data));
    ensureReference(changes, 'tsconfig.json', `./${dir}`);
    return {
      next: [
        'pnpm install   # installs the app and links it',
        'pnpm nx sync   # TypeScript project references',
        `pnpm dafne dev ${appPackage(a.kebab)}`,
        `pnpm dafne g lib <name> --app ${a.kebab}   # or g resource`,
      ],
    };
  });
}

import type { Tree } from '@nx/devkit';
import { casings, words } from '../../core/names.ts';
import { readTemplate, render, templateFiles } from '../../core/templates.ts';
import { frontendApp } from '../../core/workspace.ts';
import { runGenerator } from '../run.ts';

export interface FrontendAppSchema {
  name: string;
  /** Port of `next dev` and of APP_URL. */
  port?: number;
  /** The app's API, BACKEND_URL in .env.example. */
  backendUrl?: string;
  force?: boolean;
}

const TEMPLATES = 'frontend-app';
/** Templates stored without their leading dot. */
const DOTFILES = new Set(['gitignore', 'env.example']);

/**
 * A Next.js app in apps/<name>, set up like apps/sales-web (frontend libs,
 * next-intl in English and Italian, sign-in through apps/auth, sidebar,
 * account page) but with no resources: their pages come from
 * `dafne g frontend-resource <name> --app <app>`. The name is used as it is.
 */
export default async function frontendAppGenerator(tree: Tree, options: FrontendAppSchema) {
  return runGenerator(tree, options, (changes) => {
    const parts = words(options.name);
    if (!parts.length || !/^[a-z]/.test(parts[0])) throw new Error(`"${options.name}" must start with a letter.`);
    const a = casings(parts);
    const dir = frontendApp(a.kebab);
    const port = options.port ?? 4001;
    const data = { a, port, backendUrl: options.backendUrl ?? 'http://localhost:3000' };

    for (const file of templateFiles(TEMPLATES)) {
      if (!file.endsWith('.ejs')) {
        changes.create(`${dir}/${file}`, readTemplate(`${TEMPLATES}/${file}`));
        continue;
      }
      const path = file.slice(0, -'.ejs'.length);
      const target = DOTFILES.has(path) ? `.${path}` : path;
      changes.create(`${dir}/${target}`, render(`${TEMPLATES}/${path}`, data));
    }

    return {
      next: [
        'pnpm install   # installs the app and links it',
        `cp ${dir}/.env.example ${dir}/.env   # BACKEND_URL: the app's API`,
        `Add http://localhost:${port} to TRUSTED_ORIGINS of apps/auth`,
        `pnpm dafne dev @dafne/auth @dafne/${a.kebab}   # plus its API`,
        `pnpm dafne g frontend-resource <name> --app ${a.kebab}`,
      ],
    };
  });
}

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/* The layout of a Dafne project, relative to its root. */
export const BACKEND = 'apps/crm-api';
export const FRONTEND = 'apps/crm-web';
export const CONTRACTS_SRC = 'packages/contracts/src';
/** The backend's libs: one workspace package each, `@dafne/backend-<lib>`. */
export const BACKEND_LIBS = 'packages/backend';

/** A backend lib's folder, e.g. packages/backend/customers. */
export const backendLib = (lib: string) => `${BACKEND_LIBS}/${lib}`;
/** A backend lib's package name, e.g. @dafne/backend-customers. */
export const backendPackage = (lib: string) => `@dafne/backend-${lib}`;

/** The Dafne root: the folder that holds apps/crm-api/ and apps/crm-web/. */
export function findRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (isRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error(
        `No Dafne project found from ${from}: run the command inside the folder that holds apps/crm-api/ and apps/crm-web/, or pass --root.`,
      );
    dir = parent;
  }
}

function isRoot(dir: string) {
  return (
    existsSync(join(dir, BACKEND, 'nest-cli.json')) &&
    existsSync(join(dir, FRONTEND, 'package.json'))
  );
}

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/* The layout of a Dafne project, relative to its root. */
export const BACKEND = 'apps/backend';
export const FRONTEND = 'apps/frontend';
export const CONTRACTS_SRC = 'packages/contracts/src';

/** The Dafne root: the folder that holds apps/backend/ and apps/frontend/. */
export function findRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (isRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error(
        `No Dafne project found from ${from}: run the command inside the folder that holds apps/backend/ and apps/frontend/, or pass --root.`,
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

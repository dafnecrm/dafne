import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** The Dafne root: the folder that holds both backend/ and frontend/. */
export function findRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (isRoot(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error(
        `No Dafne project found from ${from}: run the command inside the folder that holds backend/ and frontend/, or pass --root.`,
      );
    dir = parent;
  }
}

function isRoot(dir: string) {
  return (
    existsSync(join(dir, 'backend', 'nest-cli.json')) &&
    existsSync(join(dir, 'frontend', 'package.json'))
  );
}

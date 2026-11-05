#!/usr/bin/env node
/*
 * `migration:generate` of a schema package (run from its folder):
 * drizzle-kit generate with the package's drizzle.config.ts. Extra
 * arguments go to drizzle-kit (--name, --custom).
 */
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { databasePackages, findWorkspaceRoot } from './workspace.ts';

const cwd = resolve(process.cwd());
if (!databasePackages(findWorkspaceRoot(cwd)).some((p) => p.dir === cwd)) {
  console.error(
    `${cwd} isn't a schema package ("dafne": { "schema": … } in package.json).`,
  );
  process.exit(1);
}

// drizzle-kit doesn't export its bin: the one pnpm links in this package.
const kit = join(
  import.meta.dirname,
  '..',
  'node_modules',
  '.bin',
  'drizzle-kit',
);
// Inherit the terminal: drizzle-kit may ask whether a column was renamed.
const result = spawnSync(kit, ['generate', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd,
});
process.exit(result.status ?? 1);

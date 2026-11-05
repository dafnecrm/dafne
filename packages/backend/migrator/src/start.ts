import { existsSync } from 'node:fs';
import { migrate } from './apply.ts';
import { bundledPackages } from './bundle.ts';
import type { Migration } from './plan.ts';

export interface MigrateOnStartOptions {
  /** The build's migrations folder: `join(<folder of main.js>, BUNDLED_MIGRATIONS)`. */
  migrations: string;
  env?: NodeJS.ProcessEnv;
  log?: (line: string) => void;
}

/**
 * Called by an app's main.ts before Nest starts. With MIGRATE_ON_START=true
 * it applies the pending migrations of every schema (those copied into
 * the build, see bundle.ts), as `pnpm dafne db migrate` does, with
 * MIGRATIONS_DATABASE_URL. Otherwise it does nothing: in development
 * `dafne dev` migrates first, and a deploy may run the migrator as a step.
 *
 * Replicas that start together are safe: one migrates, the others wait
 * for its lock and then find nothing to apply. A failed migration throws,
 * so the app doesn't start on a half-migrated database (the failed
 * migration itself is rolled back).
 */
export async function migrateOnStart({
  migrations,
  env = process.env,
  log = () => {},
}: MigrateOnStartOptions): Promise<Migration[]> {
  if (env.MIGRATE_ON_START !== 'true') return [];
  const url = env.MIGRATIONS_DATABASE_URL;
  if (!url)
    throw new Error(
      'MIGRATE_ON_START=true needs MIGRATIONS_DATABASE_URL (e.g. postgres://user:pass@host:5432/dafne).',
    );
  if (!existsSync(migrations))
    throw new Error(
      `MIGRATE_ON_START=true, but the build has no migrations (${migrations}).`,
    );
  const applied = await migrate({
    url,
    packages: bundledPackages(migrations),
    log: (line) => log(`applied ${line}`),
  });
  log(
    applied.length
      ? `${applied.length} migrations applied.`
      : 'Nothing to apply.',
  );
  return applied;
}

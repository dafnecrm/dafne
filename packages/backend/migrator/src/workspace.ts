import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** A workspace package that owns a schema of the database and its migrations. */
export interface DatabasePackage {
  /** Package name, e.g. @dafne/backend-database. */
  name: string;
  /** Absolute folder of the package. */
  dir: string;
  /** The Postgres schema, e.g. sales (fixed name, see CLAUDE.md). */
  schema: string;
  /** Absolute folder of its migrations (drizzle-kit `out`). */
  migrations: string;
}

/** Schema names: fixed, lowercase, not Postgres' own. */
const SCHEMA_NAME = /^[a-z][a-z0-9_]*$/;
const RESERVED = new Set(['public', 'information_schema']);

/** Folders whose packages may own a schema. */
const PACKAGE_FOLDERS = ['packages/backend'];

/** The monorepo root: the folder with pnpm-workspace.yaml. */
export function findWorkspaceRoot(from = process.cwd()): string {
  let dir = resolve(from);
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error(`No pnpm-workspace.yaml above ${from}.`);
    dir = parent;
  }
  return dir;
}

/**
 * The packages that own a schema: `"dafne": { "schema": "sales" }` in
 * their package.json, migrations in their `migrations/` folder.
 */
export function databasePackages(root: string): DatabasePackage[] {
  const found: DatabasePackage[] = [];
  for (const folder of PACKAGE_FOLDERS) {
    const base = join(root, folder);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(base, entry.name);
      const file = join(dir, 'package.json');
      if (!existsSync(file)) continue;
      const pkg = JSON.parse(readFileSync(file, 'utf8')) as {
        name: string;
        dafne?: { schema?: string };
      };
      const schema = pkg.dafne?.schema;
      if (!schema) continue;
      if (
        !SCHEMA_NAME.test(schema) ||
        RESERVED.has(schema) ||
        schema.startsWith('pg_')
      )
        throw new Error(
          `${pkg.name}: "${schema}" isn't a valid schema name (lowercase, not public or pg_*).`,
        );
      found.push({
        name: pkg.name,
        dir,
        schema,
        migrations: join(dir, 'migrations'),
      });
    }
  }
  const seen = new Map<string, string>();
  for (const { name, schema } of found) {
    const other = seen.get(schema);
    if (other)
      throw new Error(
        `Schema ${schema} is owned by both ${other} and ${name}.`,
      );
    seen.set(schema, name);
  }
  return found.sort((a, b) => a.schema.localeCompare(b.schema));
}

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/** A workspace package that owns a database and its migrations. */
export interface DatabasePackage {
  /** Package name, e.g. @dafne/backend-database. */
  name: string;
  /** Absolute folder of the package. */
  dir: string;
  /** The MySQL database, e.g. dafne_sales (fixed name, see CLAUDE.md). */
  database: string;
  /** Absolute folder of its migrations (drizzle-kit `out`). */
  migrations: string;
}

/** Database names: fixed, `dafne_<name>`. */
const DATABASE_NAME = /^dafne_[a-z][a-z0-9_]*$/;

/** Folders whose packages may own a database. */
const PACKAGE_FOLDERS = ['packages/backend'];

/** The monorepo root: the folder with pnpm-workspace.yaml. */
export function findWorkspaceRoot(from = process.cwd()): string {
  let dir = resolve(from);
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`No pnpm-workspace.yaml above ${from}.`);
    dir = parent;
  }
  return dir;
}

/**
 * The packages that own a database: `"dafne": { "database": "dafne_sales" }`
 * in their package.json, migrations in their `migrations/` folder.
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
        dafne?: { database?: string };
      };
      const database = pkg.dafne?.database;
      if (!database) continue;
      if (!DATABASE_NAME.test(database))
        throw new Error(`${pkg.name}: "${database}" isn't a valid database name (dafne_<name>).`);
      found.push({ name: pkg.name, dir, database, migrations: join(dir, 'migrations') });
    }
  }
  const seen = new Map<string, string>();
  for (const { name, database } of found) {
    const other = seen.get(database);
    if (other) throw new Error(`${database} is owned by both ${other} and ${name}.`);
    seen.set(database, name);
  }
  return found.sort((a, b) => a.database.localeCompare(b.database));
}

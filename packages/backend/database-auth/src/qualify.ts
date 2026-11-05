/*
 * The tables are written twice, from one source:
 * - src/kit/*.ts: plain `mysqlTable`s. drizzle-kit reads these (it ignores
 *   tables in a `mysqlSchema`), and the Better Auth CLI writes
 *   kit/better-auth.ts.
 * - src/<same name>.ts: the same tables in `mysqlSchema('dafne_auth')`, so
 *   every query names the database (`dafne_auth`.`user`). Apps that
 *   connect to their own database (dafne_sales) still reach the users.
 * `pnpm --filter @dafne/backend-database-auth tables:qualify` writes the
 * second from the first; qualify.spec.ts fails when they differ.
 */

export const KIT_FILES = ['better-auth.ts', 'app-access.ts'];

/** A kit file's source, with its tables moved into the dafne_auth schema. */
export function qualify(source: string, file: string): string {
  if (!/\bmysqlTable\b/.test(source)) throw new Error(`${file}: no mysqlTable to qualify.`);
  const body = source
    // The import of mysqlTable goes (its first mention); authDb.table replaces it.
    .replace(/\bmysqlTable,\s*|,\s*mysqlTable\b(?=\s*\})/, '')
    .replace(/\bmysqlTable\(/g, 'authDb.table(');
  const lines = body.split('\n');
  // After the last import statement (which may span several lines).
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (/^import\b/.test(lines[i])) last = i;
  while (last >= 0 && last < lines.length - 1 && !/from ['"][^'"]+['"];?\s*$/.test(lines[last])) last++;
  lines.splice(last + 1, 0, "import { authDb } from './auth-db.ts';");
  return `// Generated from src/kit/${file} by \`tables:qualify\` (src/qualify.ts): don't edit.\n${lines.join('\n')}`;
}

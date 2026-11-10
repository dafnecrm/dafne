/*
 * The Better Auth CLI writes `pgTable`s in the public schema, with
 * timestamps without time zone. `tables:schema` rewrites its output
 * (src/better-auth.ts) in place:
 * - `pgTable(` → `authDb.table(`, so every table is in the auth schema
 *   ("auth"."user") and the apps' schemas can point to it;
 * - `timestamp("x")` → `timestamp("x", { withTimezone: true })`.
 * Run again on its own output, it changes nothing.
 */

const IMPORT = "import { authDb } from './auth-db.ts';";
const HEADER =
  "// Written by the Better Auth CLI, then `tables:schema` (src/into-schema.ts): regenerate, don't edit.";

export function intoAuthSchema(source: string): string {
  if (source.startsWith(HEADER)) {
    return source;
  }
  if (!/\bpgTable\(/.test(source)) {
    throw new Error('No pgTable to move into the auth schema.');
  }
  const body = source
    // The import of pgTable goes (its first mention); authDb.table replaces it.
    .replace(/\bpgTable,\s*|,\s*pgTable\b(?=\s*\})/, '')
    .replace(/\bpgTable\(/g, 'authDb.table(')
    .replace(
      /\btimestamp\(("[^"]+")\)/g,
      'timestamp($1, { withTimezone: true })',
    );
  const lines = body.split('\n');
  // After the last import statement (which may span several lines).
  let last = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^import\b/.test(lines[i])) {
      last = i;
    }
  }
  while (
    last >= 0 &&
    last < lines.length - 1 &&
    !/from ['"][^'"]+['"];?\s*$/.test(lines[last])
  ) {
    last++;
  }
  lines.splice(last + 1, 0, IMPORT);
  return `${HEADER}\n${lines.join('\n')}`;
}

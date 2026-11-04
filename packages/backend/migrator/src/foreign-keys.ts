import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DatabasePackage } from './workspace.ts';

/** A foreign key as drizzle-kit's snapshot.json records it. */
export interface SnapshotForeignKey {
  name: string;
  table: string;
  tableTo: string;
  onDelete?: string;
  onUpdate?: string;
}

interface Snapshot {
  ddl?: { entityType: string; name: string; table?: string; tableTo?: string; onDelete?: string; onUpdate?: string }[];
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The snapshot of a migration folder. */
export function readSnapshot(folder: string): Snapshot {
  const file = join(folder, 'snapshot.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Snapshot) : {};
}

export const snapshotTables = (snapshot: Snapshot) =>
  (snapshot.ddl ?? []).filter((e) => e.entityType === 'tables').map((e) => e.name);

export const snapshotForeignKeys = (snapshot: Snapshot): SnapshotForeignKey[] =>
  (snapshot.ddl ?? [])
    .filter((e) => e.entityType === 'fks')
    .map((e) => ({ name: e.name, table: e.table!, tableTo: e.tableTo!, onDelete: e.onDelete, onUpdate: e.onUpdate }));

/** The migration folders of a package, oldest first. */
export function migrationFolders(pkg: DatabasePackage): string[] {
  if (!existsSync(pkg.migrations)) return [];
  return readdirSync(pkg.migrations, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(pkg.migrations, e.name, 'migration.sql')))
    .map((e) => e.name)
    .sort();
}

/** Which database each table belongs to, from each package's latest snapshot. */
export function tableOwners(packages: DatabasePackage[]): Map<string, string> {
  const owners = new Map<string, string>();
  for (const pkg of packages) {
    const latest = migrationFolders(pkg).at(-1);
    if (!latest) continue;
    for (const table of snapshotTables(readSnapshot(join(pkg.migrations, latest))))
      owners.set(table, pkg.database);
  }
  return owners;
}

const actions = ({ onDelete, onUpdate }: SnapshotForeignKey) =>
  (onDelete && onDelete !== 'NO ACTION' ? ` ON DELETE ${onDelete}` : '') +
  (onUpdate && onUpdate !== 'NO ACTION' ? ` ON UPDATE ${onUpdate}` : '');

/**
 * Fixes the foreign keys drizzle-kit 1.0.0-rc.5 writes, from the snapshot:
 * - inside CREATE TABLE it drops ON DELETE / ON UPDATE (a known bug, see
 *   packages/cli-old/CLAUDE.md), so they're written back;
 * - a key to a table of another database (e.g. a CRM table's
 *   `created_by_id` → dafne_auth's `user`) gets the database name.
 * Idempotent: a fixed migration stays as it is.
 */
export function qualifyForeignKeys(
  sql: string,
  foreignKeys: SnapshotForeignKey[],
  ownerOf: (table: string) => string | undefined,
): string {
  let out = sql;
  for (const fk of foreignKeys) {
    const database = ownerOf(fk.tableTo);
    const target = database ? `\`${database}\`.\`${fk.tableTo}\`` : `\`${fk.tableTo}\``;
    const pattern = new RegExp(
      `(CONSTRAINT \`${escape(fk.name)}\` FOREIGN KEY \\([^)]*\\) REFERENCES )(?:\`[^\`]+\`\\.)?\`${escape(fk.tableTo)}\`(\\([^)]*\\))(?: ON (?:DELETE|UPDATE) (?:CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION))*`,
      'g',
    );
    out = out.replace(pattern, (_, head: string, columns: string) => `${head}${target}${columns}${actions(fk)}`);
  }
  return out;
}

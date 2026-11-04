/*
 * drizzle-kit 1.0.0-rc.5 writes MySQL foreign keys declared inside
 * CREATE TABLE without their ON DELETE / ON UPDATE (the ALTER TABLE ones
 * are fine). The snapshot next to the migration has the right actions, so
 * they're put back from there.
 */

interface SnapshotForeignKey {
  name: string;
  onDelete?: string;
  onUpdate?: string;
  entityType: string;
}

export interface FixResult {
  sql: string;
  /** Foreign keys that got their actions back, e.g. "activity_customer_id_customer_id_fkey: ON DELETE SET NULL". */
  fixed: string[];
}

const DEFAULT_ACTION = 'NO ACTION';

export function fixMigration(sql: string, snapshotJson: string): FixResult {
  const snapshot = JSON.parse(snapshotJson) as { ddl?: SnapshotForeignKey[] };
  const foreignKeys = (snapshot.ddl ?? []).filter((entry) => entry.entityType === 'fks');
  const fixed: string[] = [];

  for (const fk of foreignKeys) {
    const actions = [
      fk.onDelete && fk.onDelete !== DEFAULT_ACTION ? ` ON DELETE ${fk.onDelete}` : '',
      fk.onUpdate && fk.onUpdate !== DEFAULT_ACTION ? ` ON UPDATE ${fk.onUpdate}` : '',
    ].join('');
    if (!actions) continue;
    // `CONSTRAINT \`name\` FOREIGN KEY (...) REFERENCES \`t\`(...)` inside a
    // CREATE TABLE, followed by "," or the closing ")" (ALTER TABLE ones end in ";").
    const name = fk.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inline = new RegExp(
      `(\\tCONSTRAINT \`${name}\` FOREIGN KEY \\([^)]*\\) REFERENCES \`[^\`]+\`\\([^)]*\\))(?=,?\\n)`,
    );
    const match = inline.exec(sql);
    if (!match) continue;
    sql = sql.slice(0, match.index) + match[1] + actions + sql.slice(match.index + match[1].length);
    fixed.push(`${fk.name}:${actions}`);
  }
  return { sql, fixed };
}

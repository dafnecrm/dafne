import type { ChangeFields } from '@dafne/backend-database-changelog';

/** A value as JSON stores it (dates as ISO strings, undefined as null). */
export function toJson(value: unknown): unknown {
  return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

/**
 * The fields of `after` that differ from `before`, as `{ from, to }` JSON
 * values. With no `before` (a create) every field that has a value is in it,
 * `from` null.
 */
export function diff(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown>,
): ChangeFields {
  const changes: ChangeFields = {};
  for (const [field, value] of Object.entries(after)) {
    const from = toJson(before?.[field]);
    const to = toJson(value);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from, to };
    }
  }
  return changes;
}

/*
 * Plain helpers to show a change log's values (JSON values, as the backend
 * stores them). No React: server and client code both import them.
 */

/** A value as text: "—" when empty, JSON for arrays and objects. */
export function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** How a list changed, its elements matched by a key (e.g. their position). */
export interface ListChange {
  added: number;
  removed: number;
  changed: number;
}

/** A field of a list element that changed. */
export interface ElementFieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

/** One element of a list that changed, by its key. */
export type ElementChange<T> =
  | { key: unknown; kind: "added"; element: T }
  | { key: unknown; kind: "removed"; element: T }
  | { key: unknown; kind: "changed"; fields: ElementFieldChange[] };

/**
 * Compares two lists of objects, matching their elements by `key`: those
 * only in `to` were added, only in `from` removed, in both but different
 * changed (with the fields that did, in `to`'s order of keys). In `to`'s
 * order, the removed ones last. A value that isn't an array counts as an
 * empty list.
 */
export function diffListElements<T extends Record<string, unknown>>(
  from: unknown,
  to: unknown,
  key: keyof T & string,
): ElementChange<T>[] {
  const before = byKey<T>(from, key);
  const after = byKey<T>(to, key);
  const result: ElementChange<T>[] = [];
  for (const [k, element] of after) {
    const old = before.get(k);
    if (old === undefined) {
      result.push({ key: k, kind: "added", element });
      continue;
    }
    const names = [...new Set([...Object.keys(element), ...Object.keys(old)])];
    const fields = names
      .filter((field) => !sameJson(old[field], element[field]))
      .map((field) => ({ field, from: old[field], to: element[field] }));
    if (fields.length) {
      result.push({ key: k, kind: "changed", fields });
    }
  }
  for (const [k, element] of before) {
    if (!after.has(k)) {
      result.push({ key: k, kind: "removed", element });
    }
  }
  return result;
}

/** How many elements `diffListElements` finds added, removed and changed. */
export function diffList<T extends Record<string, unknown>>(
  from: unknown,
  to: unknown,
  key: keyof T & string,
): ListChange {
  const count: ListChange = { added: 0, removed: 0, changed: 0 };
  for (const change of diffListElements<T>(from, to, key)) {
    count[change.kind]++;
  }
  return count;
}

function byKey<T extends Record<string, unknown>>(list: unknown, key: string) {
  const map = new Map<unknown, T>();
  if (!Array.isArray(list)) {
    return map;
  }
  for (const element of list as T[]) {
    map.set(element?.[key], element);
  }
  return map;
}

/** Deep equality of JSON values, whatever the order of object keys. */
function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((k) =>
    sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

import type { TablesRelationalConfig } from 'drizzle-orm';

type RelationsOf<T> = T extends { relations: infer R } ? R : {};

type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? {
          table: A[K] extends { table: infer T } ? T : never;
          name: K & string;
          relations: RelationsOf<A[K]> & RelationsOf<B[K]>;
        }
      : A[K]
    : K extends keyof B
      ? B[K]
      : never;
};

type MergeAll<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Rest,
]
  ? Merge<Head, MergeAll<Rest>>
  : {};

/**
 * Combines relation parts (defineRelations / defineRelationsPart). A table
 * that appears in several parts gets the relations of all of them, where a
 * plain spread would keep only the last. This lets the file that declares
 * a foreign key also declare the reverse relation on the other table,
 * without the two table files importing each other.
 */
export function mergeRelations<
  const T extends readonly TablesRelationalConfig[],
>(...parts: T): MergeAll<T> {
  const merged: TablesRelationalConfig = {};
  for (const part of parts)
    for (const [name, config] of Object.entries(part)) {
      const previous = merged[name];
      merged[name] = previous
        ? {
            ...previous,
            relations: { ...previous.relations, ...config.relations },
          }
        : config;
    }
  return merged as MergeAll<T>;
}

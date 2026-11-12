/**
 * Change log texts in English. The source of truth: it.ts must have the
 * same keys (ChangelogMessages), and the apps merge them under `changelog`.
 */
export const en = {
  open: "History",
  title: "History",
  description: "Changes to this record, newest first.",
  someone: "Someone",
  operations: {
    create: "created it",
    update: "updated it",
    delete: "deleted it",
    transition: "changed its status",
  },
  noFields: "No field changed.",
  edited: "edited",
  element: { added: "added", removed: "removed" },
  set: "added",
  added: "{count} added",
  removed: "{count} removed",
  changed: "{count} changed",
  loadMore: "Load more",
  loading: "Loading the history…",
  empty: {
    title: "No changes yet",
    description: "Changes appear here once the record is edited.",
  },
  loadError: "Couldn't load the history. Try again.",
  retry: "Try again",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type ChangelogMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "changelog.title". */
export type ChangelogMessageKey = `changelog.${Paths<ChangelogMessages>}`;

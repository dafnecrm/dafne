/**
 * Change log texts in English. The source of truth: it.ts must have the
 * same keys (ChangelogMessages), and the apps merge them under `changelog`.
 */
export const en = {
  added: "{count} added",
  changed: "{count} changed",
  description: "Changes to this record, newest first.",
  edited: "edited",
  element: { added: "added", removed: "removed" },
  empty: {
    description: "Changes appear here once the record is edited.",
    title: "No changes yet",
  },
  loadError: "Couldn't load the history. Try again.",
  loadMore: "Load more",
  loading: "Loading the history…",
  noFields: "No field changed.",
  open: "History",
  operations: {
    create: "created it",
    delete: "deleted it",
    transition: "changed its status",
    update: "updated it",
  },
  removed: "{count} removed",
  retry: "Try again",
  set: "added",
  someone: "Someone",
  title: "History",
};

/** The shape every language must have: same keys, any text. */
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type ChangelogMessages = Shape<typeof en>;

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/** A full key of these texts, e.g. "changelog.title". */
export type ChangelogMessageKey = `changelog.${Paths<ChangelogMessages>}`;

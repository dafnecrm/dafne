import type { ChangesList, Json } from "@dafne/contracts";

/** A page of the change log, as the backend sends it (dates as strings). */
export type ChangesPage = Json<ChangesList>;
export type ChangeEntryJson = ChangesPage["items"][number];

/** Loads a page of a record's changes; usually a server action of the resource. */
export type LoadChanges = (query: {
  limit: number;
  offset: number;
}) => Promise<ChangesPage | { error: string }>;

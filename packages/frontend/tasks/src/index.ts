// Public API of @dafne/frontend-tasks, compiled by Next from its sources.
// Browser-safe: reads are in ./server, mutations in ./actions.
export * from "./messages/index.ts";
export type * from "./types.ts";

/** Where the app shows the tasks. */
export const TASKS_PATH = "/admin/tasks";

/*
 * A task's key in a URL: its dots become "~" (tasks.cleanup → tasks~cleanup).
 * The app's proxy skips paths with a dot (static files), so a key as it is
 * would never get its locale, and the page would be a 404.
 */

/** The URL segment of a task's key. */
export const taskSlug = (key: string) => key.replaceAll(".", "~");

/** The task's key from its URL segment (as the route's params give it). */
export const taskKeyOf = (slug: string) => decodeURIComponent(slug).replaceAll("~", ".");

/** The task's page. */
export const taskHref = (key: string) => `${TASKS_PATH}/${taskSlug(key)}`;

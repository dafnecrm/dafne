import { pgSchema } from 'drizzle-orm/pg-core';

/** The scheduled tasks' schema: fixed name, the same in every environment (CLAUDE.md). */
export const TASKS_SCHEMA = 'tasks';

// Exported from tables/: drizzle-kit writes the schema's CREATE SCHEMA.
/** Its tables are always named with the schema ("tasks"."task_run"). */
export const tasksDb = pgSchema(TASKS_SCHEMA);

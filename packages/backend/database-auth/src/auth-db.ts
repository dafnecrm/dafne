import { pgSchema } from 'drizzle-orm/pg-core';

/** The users' schema: fixed name, the same in every environment (CLAUDE.md). */
export const AUTH_SCHEMA = 'auth';

/** Its tables are always named with the schema ("auth"."user"). */
export const authDb = pgSchema(AUTH_SCHEMA);

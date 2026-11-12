import { pgSchema } from 'drizzle-orm/pg-core';

/** The change log's schema: fixed name, the same in every environment (CLAUDE.md). */
export const CHANGELOG_SCHEMA = 'changelog';

/** Its tables are always named with the schema ("changelog"."change"). */
export const changelogDb = pgSchema(CHANGELOG_SCHEMA);

import { defineRelations } from 'drizzle-orm';
import * as appAccessTables from './app-access.ts';
// better-auth.ts is written by the Better Auth CLI, then moved into the auth
// schema (`pnpm --filter @dafne/backend-auth auth:schema:generate`).
import * as betterAuth from './better-auth.ts';
import { mergeRelations } from './merge-relations.ts';
import { appAccessRelations } from './relations.ts';

const { authRelations, ...betterAuthTables } = betterAuth;

/** Every table of the auth schema ("auth"."user"…). */
export const authSchema = { ...betterAuthTables, ...appAccessTables };

export const authDatabaseRelations = mergeRelations(
  defineRelations(authSchema),
  authRelations,
  appAccessRelations,
);

export type AuthDatabase = import('drizzle-orm/node-postgres').NodePgDatabase<typeof authDatabaseRelations>;

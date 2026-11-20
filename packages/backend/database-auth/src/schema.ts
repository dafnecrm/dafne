import { defineRelations } from 'drizzle-orm';
import * as appAccessTables from './app-access.ts';
import * as userGroups from './user-groups.ts';
// better-auth.ts is written by the Better Auth CLI, then moved into the auth
// schema (`pnpm --filter @dafne/backend-auth auth:schema:generate`).
import * as betterAuth from './better-auth.ts';
import { mergeRelations } from './merge-relations.ts';
import { appAccessRelations } from './relations.ts';

const { authRelations, ...betterAuthTables } = betterAuth;
const { userGroupRelations, ...userGroupTables } = userGroups;

/** Every table of the auth schema ("auth"."user"…, the user groups). */
export const authSchema = { ...betterAuthTables, ...appAccessTables, ...userGroupTables };

export const authDatabaseRelations = mergeRelations(
  defineRelations(authSchema),
  authRelations,
  appAccessRelations,
  userGroupRelations,
);

export type AuthDatabase = import('drizzle-orm/node-postgres').NodePgDatabase<typeof authDatabaseRelations>;

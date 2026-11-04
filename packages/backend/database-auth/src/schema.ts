import { defineRelations } from 'drizzle-orm';
import * as appAccessTables from './app-access.ts';
// better-auth.ts comes from kit/better-auth.ts, written by the Better Auth CLI
// (`pnpm --filter @dafne/backend-auth auth:schema:generate`).
import * as betterAuth from './better-auth.ts';
import { mergeRelations } from './merge-relations.ts';
import { appAccessRelations } from './relations.ts';

const { authRelations, ...betterAuthTables } = betterAuth;

/** Every table of dafne_auth, in its schema (`dafne_auth`.`user`…). */
export const authSchema = { ...betterAuthTables, ...appAccessTables };

export const authDatabaseRelations = mergeRelations(
  defineRelations(authSchema),
  authRelations,
  appAccessRelations,
);

export type AuthDatabase = import('drizzle-orm/mysql2').MySql2Database<typeof authDatabaseRelations>;

/*
 * The auth schema: the users, their sessions, the apps they can use and
 * their groups (shared by every app; each app keeps its own permissions).
 * Its tables are always named with the schema, so the apps' schemas can
 * point to them (foreign keys to "auth"."user") and join them.
 */
export { AUTH_SCHEMA, authDb } from './auth-db.ts';
export { user, session, account, verification } from './better-auth.ts';
export { appAccess } from './app-access.ts';
export { userGroup, userGroupMember, userGroupRelations } from './user-groups.ts';
export { authSchema, authDatabaseRelations, type AuthDatabase } from './schema.ts';
export { mergeRelations } from './merge-relations.ts';
export { AuthDatabaseModule } from './auth-database.module.ts';
export { postgresUrl } from './postgres-url.ts';

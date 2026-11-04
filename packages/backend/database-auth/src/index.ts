/*
 * dafne_auth: the users, their sessions and the apps they can use. Its
 * tables are always named with the database, so the apps' databases can
 * point to them (foreign keys to `dafne_auth`.`user`) and join them.
 */
export { AUTH_DATABASE, authDb } from './auth-db.ts';
export { user, session, account, verification } from './better-auth.ts';
export { appAccess } from './app-access.ts';
export { authSchema, authDatabaseRelations, type AuthDatabase } from './schema.ts';
export { mergeRelations } from './merge-relations.ts';
export { AuthDatabaseModule } from './auth-database.module.ts';

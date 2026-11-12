/*
 * The changelog schema: the change log of the CRUD resources. Written
 * only through @dafne/backend-changelog.
 */
export { CHANGELOG_SCHEMA, changelogDb } from './changelog-db.ts';
export { change, type ChangeFields } from './change.ts';

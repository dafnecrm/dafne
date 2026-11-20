// The users and their groups live in the auth schema
// (@dafne/backend-database-auth): the sales tables point to them (created/
// updated by…, a group's permissions) and join them, and every query names
// the schema ("auth"."user"). Not in tables/: drizzle-kit writes every table
// its schema files export into this package's migrations.
export { user, userGroup, userGroupMember } from '@dafne/backend-database-auth';

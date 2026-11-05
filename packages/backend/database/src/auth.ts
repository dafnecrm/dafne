// The users live in the auth schema (@dafne/backend-database-auth): the sales
// tables point to them (created/updated by…) and join them, and every query
// names the schema ("auth"."user"). Not in tables/: drizzle-kit writes every
// table its schema files export into this package's migrations.
export { user } from '@dafne/backend-database-auth';

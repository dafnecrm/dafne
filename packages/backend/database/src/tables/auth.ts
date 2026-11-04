// The users live in dafne_auth (@dafne/backend-database-auth): the CRM's
// tables point to them (created/updated by…) and join them. In a mysqlSchema,
// so drizzle-kit leaves the table out of the CRM's migrations, and every
// query names the database (`dafne_auth`.`user`).
export { user } from '@dafne/backend-database-auth';

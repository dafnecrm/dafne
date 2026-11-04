import { mysqlSchema } from 'drizzle-orm/mysql-core';

/** The users' database: fixed name, the same on every server (CLAUDE.md). */
export const AUTH_DATABASE = 'dafne_auth';

/** Tables in it are always named with the database (`dafne_auth`.`user`). */
export const authDb = mysqlSchema(AUTH_DATABASE);

import { index, mysqlTable, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';
import { user } from './better-auth.ts';

/**
 * Which apps a user can use, and with which role in each (e.g. crm: admin).
 * The session carries them (customSession, @dafne/backend-auth); each app's
 * guard (@dafne/backend-session) lets in only the users with its app.
 */
export const appAccess = mysqlTable(
  'app_access',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** The app's name, as its APP_NAME (e.g. crm). */
    app: varchar('app', { length: 64 }).notNull(),
    role: varchar('role', { length: 64 }).notNull().default('user'),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    unique('app_access_user_app_unique').on(table.userId, table.app),
    index('app_access_user_id_idx').on(table.userId),
  ],
);

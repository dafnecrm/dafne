// Generated from src/kit/app-access.ts by `tables:qualify` (src/qualify.ts): don't edit.
import { index, timestamp, unique, varchar } from 'drizzle-orm/mysql-core';
import { user } from './better-auth.ts';
import { authDb } from './auth-db.ts';

/**
 * Which apps a user can use, and with which role in each (e.g. sales: admin).
 * The session carries them (customSession, @dafne/backend-auth); each app's
 * guard (@dafne/backend-session) lets in only the users with its app.
 */
export const appAccess = authDb.table(
  'app_access',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** The app's name, as its APP_NAME (e.g. sales). */
    app: varchar('app', { length: 64 }).notNull(),
    role: varchar('role', { length: 64 }).notNull().default('user'),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    unique('app_access_user_app_unique').on(table.userId, table.app),
    index('app_access_user_id_idx').on(table.userId),
  ],
);

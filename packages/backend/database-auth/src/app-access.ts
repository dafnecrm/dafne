import { index, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { authDb } from './auth-db.ts';
import { user } from './better-auth.ts';

/**
 * Which apps a user can use, and with which role in each (e.g. sales: admin).
 * The session carries them (customSession, @dafne/backend-auth); each app's
 * guard (@dafne/backend-session) lets in only the users with its app.
 */
export const appAccess = authDb.table(
  'app_access',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** The app's name, as its APP_NAME (e.g. sales). */
    app: text('app').notNull(),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('app_access_user_app_unique').on(table.userId, table.app),
    index('app_access_user_id_idx').on(table.userId),
  ],
);

import { defineRelations } from 'drizzle-orm';
import * as authTables from './tables/auth.js';

export const schema = { ...authTables };

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id }),
  },
}));

export type Database = import('drizzle-orm/mysql2').MySql2Database<typeof relations>;

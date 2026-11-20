import { integer, primaryKey, varchar } from 'drizzle-orm/pg-core';
import { userGroup } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * What a group's members can do in the sales app: one row per permission,
 * e.g. "Customer.create". The groups and their members are shared by every
 * app (auth.user_group, managed by apps/auth); the permissions are this
 * app's own.
 */
export const userGroupPermission = salesSchema.table(
  'user_group_permission',
  {
    groupId: integer('group_id')
      .notNull()
      .references(() => userGroup.id, { onDelete: 'cascade' }),
    permission: varchar('permission', { length: 100 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.groupId, table.permission] })],
);

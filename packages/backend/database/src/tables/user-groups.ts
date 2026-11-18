import { defineRelationsPart } from 'drizzle-orm';
import { boolean, index, integer, primaryKey, timestamp, varchar, serial, text } from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * An user group managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const userGroup = salesSchema.table(
  'user_group',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    /**
     * The group applies to every user of the app, with no member list (the
     * "Tutti gli utenti" group the migration creates): its permissions are
     * everyone's.
     */
    allUsers: boolean('all_users').notNull().default(false),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the user groups they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [index('user_group_deletedAt_idx').on(table.deletedAt)],
);

/**
 * Who is in a group: one row per user and group. A removed user or group
 * takes its rows with it.
 */
export const userGroupMember = salesSchema.table(
  'user_group_member',
  {
    groupId: integer('group_id')
      .notNull()
      .references(() => userGroup.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
    index('user_group_member_userId_idx').on(table.userId),
  ],
);

/** What a group's members can do: one row per permission, e.g. "Customer.create". */
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

export const userGroupRelations = defineRelationsPart(
  { user, userGroup },
  (r) => ({
    userGroup: {
      createdBy: r.one.user({
        from: r.userGroup.createdById,
        to: r.user.id,
        alias: 'userGroupCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.userGroup.updatedById,
        to: r.user.id,
        alias: 'userGroupUpdatedBy',
      }),
    },
  }),
);

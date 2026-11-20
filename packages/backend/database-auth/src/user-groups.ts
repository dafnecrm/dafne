import { defineRelationsPart } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  primaryKey,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { authDb } from './auth-db.ts';
import { user } from './better-auth.ts';

/**
 * A group of users, shared by every app (apps/auth manages it). What its
 * members can do is each app's own: e.g. sales.user_group_permission.
 * Deletion is logical: `deletedAt` is set and the row is hidden from every
 * query, but kept in the table.
 */
export const userGroup = authDb.table(
  'user_group',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    /**
     * The group applies to every user who has access to the app reading it
     * (app_access), with no member list (the "Tutti gli utenti" group).
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
export const userGroupMember = authDb.table(
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

/** Who created and last updated a group (not generated: Dafne's own tables). */
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

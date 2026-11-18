import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  timestamp,
  varchar,
  serial,
  integer,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';
import { assistantProvider } from './assistant-providers.js';

/**
 * An assistant model managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const assistantModel = salesSchema.table(
  'assistant_model',
  {
    id: serial('id').primaryKey(),
    providerId: integer('provider_id')
      .notNull()
      .references(() => assistantProvider.id, { onDelete: 'cascade' }),
    modelId: varchar('model_id', { length: 200 }).notNull(),
    label: varchar('label', { length: 200 }).notNull(),
    supportsTools: boolean('supports_tools').notNull().default(true),
    options: jsonb('options').$type<Record<string, unknown>>(),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the assistant models they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [
    index('assistant_model_deletedAt_idx').on(table.deletedAt),
    index('assistant_model_providerId_idx').on(table.providerId),
  ],
);

export const assistantModelRelations = defineRelationsPart(
  { user, assistantModel, assistantProvider },
  (r) => ({
    assistantModel: {
      createdBy: r.one.user({
        from: r.assistantModel.createdById,
        to: r.user.id,
        alias: 'assistantModelCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.assistantModel.updatedById,
        to: r.user.id,
        alias: 'assistantModelUpdatedBy',
      }),
      provider: r.one.assistantProvider({
        from: r.assistantModel.providerId,
        to: r.assistantProvider.id,
        optional: false,
        alias: 'assistantModelProvider',
      }),
    },
    assistantProvider: {
      models: r.many.assistantModel({
        from: r.assistantProvider.id,
        to: r.assistantModel.providerId,
        alias: 'assistantModelProvider',
      }),
    },
  }),
);

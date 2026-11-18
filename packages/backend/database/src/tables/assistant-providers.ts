import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  timestamp,
  varchar,
  serial,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * An assistant provider managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const assistantProvider = salesSchema.table(
  'assistant_provider',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    kind: text('kind', {
      enum: ['anthropic', 'openai', 'openai-compatible'],
    }).notNull(),
    baseUrl: varchar('base_url', { length: 500 }),
    apiKeyEnv: varchar('api_key_env', { length: 100 }),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the assistant providers they touched.
    createdById: varchar('created_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
    updatedById: varchar('updated_by_id', { length: 36 }).references(
      () => user.id,
      { onDelete: 'set null' },
    ),
  },
  (table) => [index('assistant_provider_deletedAt_idx').on(table.deletedAt)],
);

export const assistantProviderRelations = defineRelationsPart(
  { user, assistantProvider },
  (r) => ({
    assistantProvider: {
      createdBy: r.one.user({
        from: r.assistantProvider.createdById,
        to: r.user.id,
        alias: 'assistantProviderCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.assistantProvider.updatedById,
        to: r.user.id,
        alias: 'assistantProviderUpdatedBy',
      }),
    },
  }),
);

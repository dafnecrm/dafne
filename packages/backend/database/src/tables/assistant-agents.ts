import { defineRelationsPart } from 'drizzle-orm';
import {
  index,
  primaryKey,
  timestamp,
  varchar,
  serial,
  text,
  jsonb,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';
import { assistantModel } from './assistant-models.js';
import { userGroup } from './user-groups.js';

/**
 * An assistant agent managed by the users. Deletion is logical: `deletedAt` is
 * set and the row is hidden from every query, but kept in the table.
 */
export const assistantAgent = salesSchema.table(
  'assistant_agent',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    description: text('description'),
    systemPrompt: text('system_prompt').notNull(),
    tools: jsonb('tools').$type<string[]>().notNull().default([]),
    defaultModelId: integer('default_model_id').references(
      () => assistantModel.id,
      { onDelete: 'set null' },
    ),
    allowModelOverride: boolean('allow_model_override').notNull().default(true),
    /** Who can use it: every user of the app, or the members of its groups. */
    audience: text('audience', { enum: ['everyone', 'groups'] })
      .notNull()
      .default('everyone'),
    enabled: boolean('enabled').notNull().default(false),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the assistant agents they touched.
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
    index('assistant_agent_deletedAt_idx').on(table.deletedAt),
    index('assistant_agent_defaultModelId_idx').on(table.defaultModelId),
  ],
);

/** The groups an agent with audience "groups" is open to. */
export const assistantAgentGroup = salesSchema.table(
  'assistant_agent_group',
  {
    agentId: integer('agent_id')
      .notNull()
      .references(() => assistantAgent.id, { onDelete: 'cascade' }),
    groupId: integer('group_id')
      .notNull()
      .references(() => userGroup.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.agentId, table.groupId] }),
    index('assistant_agent_group_groupId_idx').on(table.groupId),
  ],
);

export const assistantAgentRelations = defineRelationsPart(
  { user, assistantAgent, assistantModel },
  (r) => ({
    assistantAgent: {
      createdBy: r.one.user({
        from: r.assistantAgent.createdById,
        to: r.user.id,
        alias: 'assistantAgentCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.assistantAgent.updatedById,
        to: r.user.id,
        alias: 'assistantAgentUpdatedBy',
      }),
      defaultModel: r.one.assistantModel({
        from: r.assistantAgent.defaultModelId,
        to: r.assistantModel.id,
        alias: 'assistantAgentDefaultModel',
      }),
    },
  }),
);

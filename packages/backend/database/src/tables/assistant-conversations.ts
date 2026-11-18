import {
  boolean,
  index,
  integer,
  jsonb,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';
import { assistantAgent } from './assistant-agents.js';
import { assistantModel } from './assistant-models.js';

/**
 * A user's conversation with an AI assistant agent (@dafne/backend-assistant).
 * Only its owner reads it; deleting it deletes its messages and actions.
 */
export const assistantConversation = salesSchema.table(
  'assistant_conversation',
  {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    agentId: integer('agent_id')
      .notNull()
      .references(() => assistantAgent.id, { onDelete: 'cascade' }),
    /** The model it talks to now (it can switch); null: the agent's default. */
    modelId: integer('model_id').references(() => assistantModel.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 200 }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('assistant_conversation_userId_idx').on(table.userId, table.updatedAt)],
);

/**
 * The conversation's messages, in the AI SDK's provider-neutral format
 * (`ModelMessage`): user, assistant (text and tool calls) and tool
 * (results). Append-only: a conversation is replayed as stored.
 */
export const assistantMessage = salesSchema.table(
  'assistant_message',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => assistantConversation.id, { onDelete: 'cascade' }),
    role: text('role', { enum: ['user', 'assistant', 'tool'] }).notNull(),
    content: jsonb('content').$type<unknown>().notNull(),
    /**
     * A note the app added (e.g. "the user confirmed action 12"), for the
     * model: the UI shows it as a status line, not as the user's words.
     */
    note: boolean('note').notNull().default(false),
    /** The model that wrote it (assistant messages). */
    modelId: integer('model_id').references(() => assistantModel.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('assistant_message_conversationId_idx').on(table.conversationId, table.id)],
);

/**
 * A write the assistant proposed (a `propose_*` tool): it runs only when
 * the conversation's owner confirms it, as that user.
 */
export const assistantAction = salesSchema.table(
  'assistant_action',
  {
    id: serial('id').primaryKey(),
    conversationId: integer('conversation_id')
      .notNull()
      .references(() => assistantConversation.id, { onDelete: 'cascade' }),
    toolCallId: varchar('tool_call_id', { length: 100 }).notNull(),
    kind: varchar('kind', { length: 100 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: text('status', {
      enum: ['pending', 'confirmed', 'rejected', 'failed'],
    })
      .notNull()
      .default('pending'),
    result: jsonb('result').$type<{ resource?: string; id?: number; error?: string }>(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    decidedAt: timestamp('decided_at', { precision: 3, withTimezone: true }),
  },
  (table) => [index('assistant_action_conversationId_idx').on(table.conversationId)],
);

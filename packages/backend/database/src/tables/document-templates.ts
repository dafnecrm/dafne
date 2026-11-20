import { defineRelationsPart, sql } from 'drizzle-orm';
import {
  bytea,
  index,
  timestamp,
  uniqueIndex,
  varchar,
  serial,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';

/**
 * A Word (.docx) template an admin uploads for a resource (e.g. `quotation`),
 * filled by @dafne/backend-documents and converted to PDF. Templates are
 * never part of the deploy: they live only here. Each resource has at most
 * one default. Deletion is logical: `deletedAt` is set and the row is hidden
 * from every query, but kept in the table.
 */
export const documentTemplate = salesSchema.table(
  'document_template',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    /** A resource registered with DocumentsModule.forFeature, e.g. quotation. */
    resource: varchar('resource', { length: 60 }).notNull(),
    isDefault: boolean('is_default').default(false).notNull(),
    /** @api readonly */
    fileName: varchar('file_name', { length: 255 }),
    /** @api readonly */
    size: integer('size'),
    /** The uploaded .docx (PUT /document-templates/:id/file); null until then. */
    content: bytea('content'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the document templates they touched.
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
    index('document_template_deletedAt_idx').on(table.deletedAt),
    index('document_template_resource_idx').on(table.resource),
    // At most one default per resource among the templates not deleted.
    uniqueIndex('document_template_default_uq')
      .on(table.resource)
      .where(sql`${table.isDefault} and ${table.deletedAt} is null`),
  ],
);

export const documentTemplateRelations = defineRelationsPart(
  { user, documentTemplate },
  (r) => ({
    documentTemplate: {
      createdBy: r.one.user({
        from: r.documentTemplate.createdById,
        to: r.user.id,
        alias: 'documentTemplateCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.documentTemplate.updatedById,
        to: r.user.id,
        alias: 'documentTemplateUpdatedBy',
      }),
    },
  }),
);

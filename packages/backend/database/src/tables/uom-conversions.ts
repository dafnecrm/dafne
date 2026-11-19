import { defineRelationsPart, sql } from 'drizzle-orm';
import {
  check,
  index,
  numeric,
  timestamp,
  uniqueIndex,
  varchar,
  serial,
} from 'drizzle-orm/pg-core';
import { user } from '../auth.js';
import { salesSchema } from './sales.js';
import { uom } from './uoms.js';

/**
 * A conversion between two units of the same kind, the same for every
 * product: 1 `to` = `factor` × `from` (g → kg: 1000). One direction per
 * pair: the other is 1 / factor. A product can be sold in the units its base
 * unit converts to directly. Deletion is logical: `deletedAt` is set and the
 * row is hidden from every query, but kept in the table.
 */
export const uomConversion = salesSchema.table(
  'uom_conversion',
  {
    id: serial('id').primaryKey(),
    fromUomId: varchar('from_uom_id', { length: 10 })
      .notNull()
      .references(() => uom.id, { onDelete: 'restrict' }),
    toUomId: varchar('to_uom_id', { length: 10 })
      .notNull()
      .references(() => uom.id, { onDelete: 'restrict' }),
    factor: numeric('factor', {
      precision: 20,
      scale: 10,
      mode: 'number',
    }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at', { precision: 3, withTimezone: true }),
    // Nullable so removing a user keeps the uom conversions they touched.
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
    index('uom_conversion_deletedAt_idx').on(table.deletedAt),
    index('uom_conversion_fromUomId_idx').on(table.fromUomId),
    index('uom_conversion_toUomId_idx').on(table.toUomId),
    // One live conversion per pair, whichever its direction.
    uniqueIndex('uom_conversion_pair_idx')
      .on(
        sql`least(${table.fromUomId}, ${table.toUomId})`,
        sql`greatest(${table.fromUomId}, ${table.toUomId})`,
      )
      .where(sql`${table.deletedAt} is null`),
    check('uom_conversion_factor_positive', sql`${table.factor} > 0`),
    check('uom_conversion_distinct', sql`${table.fromUomId} <> ${table.toUomId}`),
  ],
);

export const uomConversionRelations = defineRelationsPart(
  { user, uomConversion, uom },
  (r) => ({
    uomConversion: {
      createdBy: r.one.user({
        from: r.uomConversion.createdById,
        to: r.user.id,
        alias: 'uomConversionCreatedBy',
      }),
      updatedBy: r.one.user({
        from: r.uomConversion.updatedById,
        to: r.user.id,
        alias: 'uomConversionUpdatedBy',
      }),
      fromUom: r.one.uom({
        from: r.uomConversion.fromUomId,
        to: r.uom.id,
        optional: false,
        alias: 'uomConversionFromUom',
      }),
      toUom: r.one.uom({
        from: r.uomConversion.toUomId,
        to: r.uom.id,
        optional: false,
        alias: 'uomConversionToUom',
      }),
    },
    uom: {
      // The conversions this unit is the `from` of, and the `to` of.
      conversions: r.many.uomConversion({
        from: r.uom.id,
        to: r.uomConversion.fromUomId,
        alias: 'uomConversionFromUom',
      }),
      conversionsTo: r.many.uomConversion({
        from: r.uom.id,
        to: r.uomConversion.toUomId,
        alias: 'uomConversionToUom',
      }),
    },
  }),
);

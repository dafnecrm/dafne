import { pgSchema } from 'drizzle-orm/pg-core';

/**
 * The sales app's schema: every table of this package is in it
 * ("sales"."customer"). Fixed name, the same in every environment (CLAUDE.md).
 */
export const salesSchema = pgSchema('sales');

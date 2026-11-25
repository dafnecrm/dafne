/*
 * API contracts shared with the frontend: request schemas (Zod) and
 * response types. Plain Zod only, no Nest or Node code, since the frontend
 * imports this library too.
 *
 * Relative imports here end in .ts, not .js like the rest of the backend:
 * the frontend's bundler (Turbopack) doesn't map .js to .ts.
 */
export * from './common.ts';
export * from './messages/index.ts';
export * from './customers.ts';
export * from './roles.ts';
export * from './permissions.ts';
export * from './users.ts';
export * from './activities.ts';
export * from './geo.ts';
export * from './countries.ts';
export * from './products.ts';
export * from './sales-orders.ts';
export * from './sales-order-types.ts';
export * from './changelog.ts';
export * from './assistant.ts';
export * from './assistant-providers.ts';
export * from './assistant-models.ts';
export * from './assistant-agents.ts';
export * from './user-groups.ts';
export * from './uoms.ts';
export * from './uom-conversions.ts';
export * from './quotations.ts';
export * from './document-templates.ts';
export * from './tasks.ts';

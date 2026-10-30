/*
 * API contracts shared with the frontend: request schemas (Zod) and
 * response types. Plain Zod only, no Nest or Node code, since the frontend
 * imports this library too.
 *
 * Relative imports here end in .ts, not .js like the rest of the backend:
 * the frontend's bundler (Turbopack) doesn't map .js to .ts.
 */
export * from './common.ts';
export * from './customers.ts';
export * from './users.ts';
export * from './activities.ts';
export * from './tasks.ts';

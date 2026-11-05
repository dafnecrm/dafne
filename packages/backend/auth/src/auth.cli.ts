// Auth instance for the Better Auth CLI only (`pnpm --filter @dafne/backend-auth auth:schema:generate`).
// The CLI needs an exported `auth`; the app builds its own in auth.module.ts.
// Generating the schema doesn't query the database, so a mock db is enough.
import { drizzle } from 'drizzle-orm/node-postgres';
import { authDatabaseRelations } from '@dafne/backend-database-auth';
import { createAuth } from './auth.js';

export const auth = createAuth(drizzle.mock({ relations: authDatabaseRelations }), {
  secret: 'better-auth-cli',
});

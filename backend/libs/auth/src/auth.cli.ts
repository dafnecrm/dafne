// Auth instance for the Better Auth CLI only (`pnpm auth:schema:generate`).
// The CLI needs an exported `auth`; the app builds its own in auth.module.ts.
// Generating the schema doesn't query the database, so a mock db is enough.
import { drizzle } from 'drizzle-orm/mysql2';
import { relations } from '@app/database';
import { createAuth } from './auth.js';

export const auth = createAuth(drizzle.mock({ relations }), {
  secret: 'better-auth-cli',
});

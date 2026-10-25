import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { schema, type Database } from '@app/database';
import { authOptions } from './auth.options.js';

export interface CreateAuthOptions {
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
}

/** The Better Auth instance: the shared options plus database and environment. */
export function createAuth(db: Database, options: CreateAuthOptions) {
  return betterAuth({
    ...authOptions,
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema,
    }),
  });
}

export type Auth = ReturnType<typeof createAuth>;

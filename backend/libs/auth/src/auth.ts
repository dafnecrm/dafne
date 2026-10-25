import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { schema, type Database } from '@app/database';

export interface CreateAuthOptions {
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
}

export function createAuth(db: Database, options: CreateAuthOptions) {
  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema,
    }),
    advanced: {
      database: {
        joins: true,
      },
      cookiePrefix: 'tiny-crm'
    },
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        firstname: {
          type: 'string',
          required: true,
        },
        lastname: {
          type: 'string',
          required: true,
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

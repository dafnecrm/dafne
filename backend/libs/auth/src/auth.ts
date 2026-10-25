import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { z } from 'zod';
import { schema, type Database } from '@app/database';

/** Validates a name field on sign-up (column is varchar(255)). */
const nameField = (label: string) => ({
  type: 'string' as const,
  required: true,
  validator: {
    input: z
      .string({ error: `${label} is required` })
      .trim()
      .min(1, { error: `${label} is required` })
      .max(255, { error: `${label} must be at most 255 characters` }),
  },
});

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
        firstname: nameField('First name'),
        lastname: nameField('Last name'),
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

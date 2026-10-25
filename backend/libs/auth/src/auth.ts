import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';
import { z } from 'zod';
import { schema, type Database } from '@app/database';

/**
 * First/last name field. `sortable` makes the CLI generate varchar(255).
 * Max 127 so Better Auth's `name` ("first last", varchar(255)) always fits.
 */
const NAME_MAX = 127;
const nameField = (label: string) => ({
  type: 'string' as const,
  required: true,
  sortable: true,
  validator: {
    input: z
      .string({ error: `${label} is required` })
      .trim()
      .min(1, { error: `${label} is required` })
      .max(NAME_MAX, {
        error: `${label} must be at most ${NAME_MAX} characters`,
      }),
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
    plugins: [admin()],
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema,
    }),
    advanced: {
      database: {
        joins: true,
      },
      cookiePrefix: 'tiny-crm',
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

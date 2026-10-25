import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
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

/**
 * Avatars are stored as data URLs in `user.image` (MySQL TEXT, max 65,535
 * bytes). The frontend shrinks images to fit; this rejects anything else.
 */
const AVATAR_MAX_LENGTH = 60_000;
const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

function assertValidImage(image: unknown) {
  if (image === undefined || image === null) return;
  if (
    typeof image !== 'string' ||
    image.length > AVATAR_MAX_LENGTH ||
    !AVATAR_DATA_URL.test(image)
  ) {
    throw new APIError('BAD_REQUEST', {
      code: 'INVALID_AVATAR',
      message: "This image can't be used. Pick a PNG, JPEG or WebP image.",
    });
  }
}

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
    databaseHooks: {
      user: {
        create: {
          before: async (user) => assertValidImage(user.image),
        },
        update: {
          before: async (user) => assertValidImage(user.image),
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

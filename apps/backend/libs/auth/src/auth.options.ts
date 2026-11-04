import type { BetterAuthOptions } from 'better-auth';
import { APIError } from 'better-auth/api';
import { admin } from 'better-auth/plugins';
import { z } from 'zod';

/*
 * Better Auth options that don't depend on the database or the environment.
 * createAuth() (auth.ts) adds those. The frontend imports this file's *type*
 * to infer the user fields and plugins, so keep it free of Nest and
 * `@app/*` imports.
 */

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

export const authOptions = {
  plugins: [admin()],
  advanced: {
    database: {
      joins: true,
    },
    cookiePrefix: 'dafne',
  },
  emailAndPassword: {
    enabled: true,
    // Sign-in fails with EMAIL_NOT_VERIFIED until the user clicks the email link.
    requireEmailVerification: true,
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
} satisfies BetterAuthOptions;

export type AuthOptions = typeof authOptions;

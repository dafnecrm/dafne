import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { schema, type Database } from '@app/database';
import { Resend } from 'resend';
import { authOptions } from './auth.options.js';
export interface CreateAuthOptions {
  secret: string;
  baseURL?: string;
  trustedOrigins?: string[];
  resendApiKey?: string;
}

/** The Better Auth instance: the shared options plus database and environment. */
export function createAuth(db: Database, options: CreateAuthOptions) {
  // The schema CLI passes no API key, and the Resend constructor throws without one.
  const resend = options.resendApiKey ? new Resend(options.resendApiKey) : undefined;
  return betterAuth({
    ...authOptions,
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'mysql',
      schema,
    }),
    emailVerification: {
      sendOnSignUp: true,
      // An unverified user who tries to sign in gets a fresh link.
      sendOnSignIn: true,
      // Clicking the link signs the user in.
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        if (!resend) throw new Error('RESEND_API_KEY is not set');
        // Not awaited, so response time doesn't reveal whether the email exists.
        console.log("Sending email verification to " + user.email)
        void resend.emails
          .send({
            from: 'Dafne <noreply@dafne.redpike.eu>',
            to: user.email,
            subject: 'Dafne- Verify your email address',
            html: `Click <a href="${url}">here</a> to verify your email.`,
          })
          .then(({ error }) => {
            if (error) console.error('Verification email failed:', error);
          });
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

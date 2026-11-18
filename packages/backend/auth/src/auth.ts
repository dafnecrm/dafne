import { drizzleAdapter } from '@better-auth/drizzle-adapter/relations-v2';
import { betterAuth } from 'better-auth';
import { customSession } from 'better-auth/plugins';
import { appAccess, authSchema, type AuthDatabase } from '@dafne/backend-database-auth';
import { Resend } from 'resend';
import { localeFrom } from '@dafne/backend-common';
import { authOptions } from '@dafne/auth-options';
import { isGlobalAdmin } from '@dafne/contracts';
import type { UserChangelog } from './user-changelog.js';

/** The verification email, by language. */
const VERIFY_EMAIL = {
  en: {
    subject: 'Dafne - Verify your email address',
    html: (url: string) => `Click <a href="${url}">here</a> to verify your email.`,
  },
  it: {
    subject: 'Dafne - Verifica il tuo indirizzo email',
    html: (url: string) =>
      `Clicca <a href="${url}">qui</a> per verificare la tua email.`,
  },
};

export interface CreateAuthOptions {
  secret: string;
  /**
   * The public URL in the email links: a frontend (it proxies /api/auth
   * here). With `allowedHosts`, only the fallback for calls without a
   * request.
   */
  baseURL?: string;
  /**
   * The frontends' hosts (wildcards allowed, e.g. `*.dafne.localhost`):
   * each request's base URL is its own frontend's, so every app's email
   * links go back to it. They are trusted origins too.
   */
  allowedHosts?: string[];
  trustedOrigins?: string[];
  resendApiKey?: string;
  /**
   * The parent domain of the apps (e.g. cliente.it, or localhost): the
   * session cookie is set for it, so sales.cliente.it and reporting.cliente.it
   * share the sign-in. Without it, the cookie is the host's only.
   */
  cookieDomain?: string;
  /** Apps a new user can use from the start (app_access), e.g. ['sales']. */
  defaultApps?: string[];
  /** Logs the writes to users (userChangelog); none in the schema CLI. */
  changelog?: UserChangelog;
}

/** A user's apps and roles in them, as the session carries them. */
export type UserApps = Record<string, string>;

async function userApps(db: AuthDatabase, userId: string): Promise<UserApps> {
  const rows = await db.query.appAccess.findMany({ where: { userId }, columns: { app: true, role: true } });
  return Object.fromEntries(rows.map((row) => [row.app, row.role]));
}

/**
 * The base URL: fixed (`baseURL`), or with `allowedHosts` the host of each
 * request. The frontends proxy /api/auth here, so the host comes from
 * their `x-forwarded-host` (trusted only when it is an allowed host).
 */
export function baseURLOptions(baseURL: string | undefined, allowedHosts: string[] = []) {
  if (!allowedHosts.length) {
    return { baseURL, trustedProxyHeaders: false };
  }
  return {
    baseURL: { allowedHosts, fallback: baseURL, protocol: 'auto' as const },
    trustedProxyHeaders: true,
  };
}

/** The Better Auth instance: the shared options plus database and environment. */
export function createAuth(db: AuthDatabase, options: CreateAuthOptions) {
  // The schema CLI passes no API key, and the Resend constructor throws without one.
  const resend = options.resendApiKey ? new Resend(options.resendApiKey) : undefined;
  const { baseURL, trustedProxyHeaders } = baseURLOptions(options.baseURL, options.allowedHosts);
  return betterAuth({
    ...authOptions,
    secret: options.secret,
    baseURL,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: authSchema,
    }),
    advanced: {
      ...authOptions.advanced,
      trustedProxyHeaders,
      crossSubDomainCookies: options.cookieDomain
        ? { enabled: true, domain: options.cookieDomain }
        : undefined,
    },
    plugins: [
      ...authOptions.plugins,
      // The apps the user can use go with the session (user.apps), so each
      // app's guard checks them without another query.
      customSession(async ({ user, session }) => ({
        user: { ...user, apps: await userApps(db, user.id) },
        session,
      })),
    ],
    databaseHooks: {
      ...authOptions.databaseHooks,
      user: {
        ...authOptions.databaseHooks.user,
        create: {
          ...authOptions.databaseHooks.user.create,
          // A new user (sign-up or created by an admin) gets the default apps.
          after: async (user, context) => {
            await options.changelog?.('create', user, context);
            const role = isGlobalAdmin((user as { role?: string | null }).role) ? 'admin' : 'user';
            const apps = options.defaultApps ?? [];
            if (!apps.length) {
              return;
            }
            await db
              .insert(appAccess)
              .values(apps.map((app) => ({ id: crypto.randomUUID(), userId: user.id, app, role })))
              .onConflictDoUpdate({ target: [appAccess.userId, appAccess.app], set: { role } });
          },
        },
        // Every write to a user (profile, email, role, ban, verification) goes through these.
        update: {
          ...authOptions.databaseHooks.user.update,
          after: async (user, context) => {
            await options.changelog?.('update', user, context);
          },
        },
        delete: {
          after: async (user, context) => {
            await options.changelog?.('delete', user, context);
          },
        },
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      // An unverified user who tries to sign in gets a fresh link.
      sendOnSignIn: true,
      // Clicking the link signs the user in.
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }, request) => {
        // In the language of the browser that signed up or signed in.
        const email =
          VERIFY_EMAIL[localeFrom(request?.headers.get('accept-language') ?? undefined)];
        if (!resend) {
          throw new Error('RESEND_API_KEY is not set');
        }
        // Not awaited, so response time doesn't reveal whether the email exists.
        console.log("Sending email verification to " + user.email)
        void resend.emails
          .send({
            from: 'Dafne <noreply@dafne.redpike.eu>',
            to: user.email,
            subject: email.subject,
            html: email.html(url),
          })
          .then(({ error }) => {
            if (error) {
              console.error('Verification email failed:', error);
            }
          });
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserSession } from './session.types.js';

/** A session is asked again after this long (sign-out takes effect within it). */
const CACHE_MS = 5_000;
const CACHE_MAX = 1_000;

/**
 * Asks apps/auth for the session of a cookie (Better Auth's get-session),
 * with a short in-memory cache: one call per cookie every few seconds.
 */
@Injectable()
export class SessionClient {
  private readonly logger = new Logger(SessionClient.name);
  private readonly url: string;
  private readonly cache = new Map<string, { session: UserSession | null; until: number }>();

  constructor(config: ConfigService) {
    const auth = config.get<string>('AUTH_URL') ?? 'http://localhost:3001';
    this.url = `${auth.replace(/\/$/, '')}/api/auth/get-session`;
  }

  async get(cookie: string): Promise<UserSession | null> {
    const now = Date.now();
    const cached = this.cache.get(cookie);
    if (cached && cached.until > now) {
      return cached.session;
    }

    let res: Response;
    try {
      res = await fetch(this.url, { headers: { cookie }, cache: 'no-store' });
    } catch (error) {
      this.logger.error(`Session check failed: ${String(error)}`);
      throw new ServiceUnavailableException('auth service unreachable');
    }
    // A failed check is not "signed out": don't drop the user on an outage.
    if (res.status >= 500) {
      throw new ServiceUnavailableException(`auth service answered ${res.status}`);
    }
    const session = res.ok ? ((await res.json()) as UserSession | null) : null;

    if (this.cache.size >= CACHE_MAX) {
      this.cache.clear();
    }
    this.cache.set(cookie, { session, until: now + CACHE_MS });
    return session;
  }
}

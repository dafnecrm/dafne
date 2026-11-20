import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';

/** The cache key every app's cached permissions are versioned by. */
export const PERMISSIONS_VERSION_KEY = 'permissions:version';

/**
 * The version of the groups, in the cache every app shares (Redis): the
 * apps key their cached permissions by it (@dafne/backend-permissions), so
 * bumping it after a write to a group (its members, here in apps/auth, or
 * an app's permissions) applies the change at once everywhere. Needs the
 * app's global CacheModule.
 */
@Injectable()
export class PermissionsVersion {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async current(): Promise<number> {
    return (await this.cache.get<number>(PERMISSIONS_VERSION_KEY)) ?? 0;
  }

  /** Drops every app's cached permissions. */
  async bump(): Promise<void> {
    await this.cache.set(PERMISSIONS_VERSION_KEY, (await this.current()) + 1, 0);
  }
}

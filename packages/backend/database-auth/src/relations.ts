import { defineRelationsPart } from 'drizzle-orm';
import { appAccess } from './app-access.ts';
import { user } from './better-auth.ts';

/** A user's apps, and back (not generated: app_access is Dafne's own table). */
export const appAccessRelations = defineRelationsPart({ user, appAccess }, (r) => ({
  user: {
    apps: r.many.appAccess({ from: r.user.id, to: r.appAccess.userId }),
  },
  appAccess: {
    user: r.one.user({ from: r.appAccess.userId, to: r.user.id }),
  },
}));

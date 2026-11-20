import { defineRelationsPart } from 'drizzle-orm';
import { appAccess } from './app-access.ts';
import { user } from './better-auth.ts';
import { userGroup, userGroupMember } from './user-groups.ts';

/** A user's apps, and back (not generated: app_access is Dafne's own table). */
export const appAccessRelations = defineRelationsPart({ user, appAccess, userGroupMember, userGroup }, (r) => ({
  user: {
    apps: r.many.appAccess({ from: r.user.id, to: r.appAccess.userId }),
    groups: r.many.userGroup({ 
      from: r.user.id.through(r.userGroupMember.userId), 
      to: r.userGroup.id.through(r.userGroupMember.groupId)
    })
  },
  appAccess: {
    user: r.one.user({ from: r.appAccess.userId, to: r.user.id }),
  },
}));

import { changelogTransitionHook, type ChangelogOptions } from '@dafne/backend-changelog';
import type { ActivityDetail } from '@dafne/contracts';

/** The resource's name in the change log (and in CrudHooks). */
export const ACTIVITIES_RESOURCE = 'activities';

/**
 * What the change log keeps of an activity. Not the status: the state
 * machine logs its changes (ActivityStatusChangelog), once each.
 */
export const ACTIVITY_CHANGELOG: ChangelogOptions<ActivityDetail> = {
  fields: ['name', 'type', 'dueDate', 'notes'],
};

/** Logs the status changes of activities (a hook of every transition). */
export const ActivityStatusChangelog = changelogTransitionHook(ACTIVITIES_RESOURCE);

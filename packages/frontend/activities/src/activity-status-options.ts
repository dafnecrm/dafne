import { ActivityStatus } from "@dafne/contracts";
import { ActivitiesMessageKey } from "./messages/en";

/**
 * Labels (message keys) of the status values. Plain data only: the table
 * config carries them from the server page to the client table, so no
 * icons here (components can't be passed to Client Components); those
 * are in `components/activities-table.tsx`.
 */
export const ACTIVITY_STATUS_OPTIONS = [
  { value: "open", label: "activities.status.open" },
  { value: "closed", label: "activities.status.closed" },
] satisfies { value: ActivityStatus; label: ActivitiesMessageKey }[];

/**
 * Statuses an activity can be edited from. Whether it can be closed or
 * reopened comes from its `nextStatuses` (the state machine).
 */
export const ACTIVITY_STATUSES_ALLOW_EDIT: ActivityStatus[] = ["open"];
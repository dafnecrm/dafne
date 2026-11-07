import type { ActivityStatus } from "@dafne/contracts";
import { CircleIcon, CircleOffIcon, type LucideIcon } from "lucide-react";

/**
 * Icon of each status, shown next to its label. Not in the plain-data
 * options (`activity-status-options.ts`): components can't be passed from
 * the server page to the client table. No "use client" here, so server
 * components (the detail) get the icons themselves.
 */
export const ACTIVITY_STATUS_ICONS: Record<ActivityStatus, LucideIcon> = {
  open: CircleIcon,
  closed: CircleOffIcon,
};

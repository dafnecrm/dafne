import { ActivityType } from "@dafne/contracts";
import { ActivitiesMessageKey } from "./messages/en";

export const ACTIVITY_TYPE_OPTIONS = [
  { value: "call", label: "activities.type.call" },
  { value: "email", label: "activities.type.email" },
  { value: "meeting", label: "activities.type.meeting" },
  { value: "task", label: "activities.type.task" },
] satisfies { value: ActivityType; label: ActivitiesMessageKey }[];

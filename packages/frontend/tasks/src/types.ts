import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/* The tasks API's responses as they arrive in JSON (dates as strings). */
export type ListedTask = Json<contracts.ListedTask>;
export type TaskDetail = Json<contracts.TaskDetail>;
export type TaskRun = Json<contracts.TaskRun>;
export type TaskRunsList = Json<contracts.TaskRunsList>;
export type TaskRunDetail = Json<contracts.TaskRunDetail>;
export type TaskRunLog = Json<contracts.TaskRunLog>;
export type { TaskRunStatus, TaskTrigger, TaskLogLevel } from "@dafne/contracts";

/** The values of the settings form: all text, as the inputs hold them. */
export interface TaskSettingsValues {
  cron: string;
  timezone: string;
  enabled: boolean;
  timeoutSeconds: string;
}

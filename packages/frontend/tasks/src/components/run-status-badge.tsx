import { useTranslations } from "next-intl";
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleSlashIcon,
  CircleXIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { Badge } from "@dafne/frontend-ui/components/badge";
import type { TaskRunStatus } from "../types.ts";

const ICONS = {
  queued: CircleDashedIcon,
  running: LoaderCircleIcon,
  succeeded: CircleCheckIcon,
  failed: CircleXIcon,
  skipped: CircleSlashIcon,
} satisfies Record<TaskRunStatus, unknown>;

const VARIANTS = {
  queued: "outline",
  running: "secondary",
  succeeded: "outline",
  failed: "destructive",
  skipped: "ghost",
} as const satisfies Record<TaskRunStatus, string>;

/** A run's status, as a badge. */
export function RunStatusBadge({ status }: { status: TaskRunStatus }) {
  const t = useTranslations("tasks.status");
  const Icon = ICONS[status];
  return (
    <Badge variant={VARIANTS[status]}>
      <Icon data-icon="inline-start" className={status === "running" ? "animate-spin" : undefined} />
      {t(status)}
    </Badge>
  );
}

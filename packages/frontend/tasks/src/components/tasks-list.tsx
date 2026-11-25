import Link from "next/link";
import { useTranslations } from "next-intl";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import { Badge } from "@dafne/frontend-ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dafne/frontend-ui/components/table";
import { taskSlug } from "../index.ts";
import type { ListedTask } from "../types.ts";
import { AutoRefresh } from "./auto-refresh.tsx";
import { RunStatusBadge } from "./run-status-badge.tsx";
import { useTaskTexts } from "./use-task-texts.ts";

/** Every task: its schedule, next run and last run; each links to `<path>/<slug>` (taskSlug). */
export function TasksList({ tasks, path }: { tasks: ListedTask[]; path: string }) {
  const t = useTranslations("tasks");
  const texts = useTaskTexts();
  if (!tasks.length) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
  }
  const active = tasks.some((task) => task.lastRun?.status === "queued" || task.lastRun?.status === "running");
  return (
    <>
      <AutoRefresh active={active} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("fields.task")}</TableHead>
            <TableHead>{t("fields.schedule")}</TableHead>
            <TableHead>{t("fields.nextRunAt")}</TableHead>
            <TableHead>{t("fields.lastRun")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => {
            const { name, description } = texts(task.key);
            return (
              <TableRow key={task.key}>
                <TableCell className="whitespace-normal">
                  <Link href={`${path}/${taskSlug(task.key)}`} className="font-medium hover:underline">
                    {name}
                  </Link>
                  {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </TableCell>
                <TableCell>
                  {!task.enabled ? (
                    <Badge variant="ghost">{t("off")}</Badge>
                  ) : task.cron ? (
                    <code className="text-xs">{task.cron}</code>
                  ) : (
                    <span className="text-muted-foreground">{t("manualOnly")}</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.nextRunAt ? <LocalDate value={task.nextRunAt} format="dateTime" /> : "—"}
                </TableCell>
                <TableCell>
                  {task.lastRun ? (
                    <div className="flex items-center gap-2">
                      <RunStatusBadge status={task.lastRun.status} />
                      <LocalDate value={task.lastRun.queuedAt} format="dateTime" className="text-xs text-muted-foreground" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">{t("never")}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}

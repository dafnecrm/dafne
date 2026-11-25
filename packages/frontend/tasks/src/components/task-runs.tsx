import Link from "next/link";
import { useTranslations } from "next-intl";
import { TASK_RUN_STATUSES } from "@dafne/contracts";
import { Button } from "@dafne/frontend-ui/components/button";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dafne/frontend-ui/components/table";
import type { TaskRunStatus, TaskRunsList } from "../types.ts";
import { AutoRefresh } from "./auto-refresh.tsx";
import { RunStatusBadge } from "./run-status-badge.tsx";
import { runDuration, useRunError } from "./use-task-texts.ts";

/**
 * A page of a task's runs, newest first, filtered by status
 * (`?status=`), paged (`?offset=`); each run links to `<path>/runs/<id>`.
 * `path` is the task's page.
 */
export function TaskRuns({
  runs,
  path,
  status,
}: {
  runs: TaskRunsList;
  path: string;
  status?: TaskRunStatus;
}) {
  const t = useTranslations("tasks");
  const runError = useRunError();
  const href = (params: { status?: TaskRunStatus; offset?: number }) => {
    const query = new URLSearchParams();
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.offset) {
      query.set("offset", String(params.offset));
    }
    const text = query.toString();
    return text ? `${path}?${text}` : path;
  };
  const { items, total, limit, offset } = runs;
  const active = items.some((run) => run.status === "queued" || run.status === "running");

  return (
    <div className="flex flex-col gap-3">
      <AutoRefresh active={active} />
      <div className="flex flex-wrap gap-1">
        {[undefined, ...TASK_RUN_STATUSES].map((value) => (
          <Button
            key={value ?? "all"}
            size="xs"
            variant={value === status ? "secondary" : "ghost"}
            nativeButton={false}
            render={<Link href={href({ status: value })} />}
          >
            {value ? t(`status.${value}`) : t("runs.all")}
          </Button>
        ))}
      </div>
      {items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("runs.fields.id")}</TableHead>
              <TableHead>{t("runs.fields.status")}</TableHead>
              <TableHead>{t("runs.fields.trigger")}</TableHead>
              <TableHead>{t("runs.fields.queuedAt")}</TableHead>
              <TableHead>{t("runs.fields.duration")}</TableHead>
              <TableHead>{t("runs.fields.error")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((run) => (
              <TableRow key={run.id}>
                <TableCell>
                  <Link href={`${path}/runs/${run.id}`} className="font-medium hover:underline">
                    #{run.id}
                  </Link>
                </TableCell>
                <TableCell>
                  <RunStatusBadge status={run.status} />
                </TableCell>
                <TableCell>
                  {run.triggeredBy?.name ?? t(`trigger.${run.trigger}`)}
                  {run.source && <span className="text-muted-foreground"> ({run.source})</span>}
                </TableCell>
                <TableCell>
                  <LocalDate value={run.queuedAt} format="dateTime" />
                </TableCell>
                <TableCell>{runDuration(run) ?? "—"}</TableCell>
                <TableCell className="max-w-80 truncate text-destructive" title={run.error ?? undefined}>
                  {run.error ? runError(run.error) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">{t("runs.empty")}</p>
      )}
      {total > limit && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span>{t("runs.page", { from: offset + 1, to: Math.min(offset + limit, total), total })}</span>
          <Button
            size="xs"
            variant="outline"
            disabled={offset === 0}
            nativeButton={false}
            render={<Link href={href({ status, offset: Math.max(0, offset - limit) })} />}
          >
            {t("runs.previous")}
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={offset + limit >= total}
            nativeButton={false}
            render={<Link href={href({ status, offset: offset + limit })} />}
          >
            {t("runs.next")}
          </Button>
        </div>
      )}
    </div>
  );
}

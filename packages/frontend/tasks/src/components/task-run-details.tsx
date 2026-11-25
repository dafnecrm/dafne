import { useTranslations } from "next-intl";
import {
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  CalendarClockIcon,
  CircleCheckBigIcon,
  CirclePlayIcon,
  CircleXIcon,
  FlagIcon,
  ScrollTextIcon,
  TimerIcon,
  UserIcon,
} from "lucide-react";
import { Detail, DetailSection } from "@dafne/frontend-ui/components/detail";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import type { TaskLogLevel, TaskRunDetail } from "../types.ts";
import { AutoRefresh } from "./auto-refresh.tsx";
import { RunStatusBadge } from "./run-status-badge.tsx";
import { runDuration, useRunError } from "./use-task-texts.ts";

const LEVEL_CLASS = {
  debug: "text-muted-foreground",
  info: "",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
} satisfies Record<TaskLogLevel, string>;

const json = (value: unknown) => JSON.stringify(value, null, 2);

/** A run: when and how it went, its error, input, result and log. */
export function TaskRunDetails({ run }: { run: TaskRunDetail }) {
  const t = useTranslations("tasks");
  const runError = useRunError();
  const active = run.status === "queued" || run.status === "running";
  return (
    <>
      <AutoRefresh active={active} />
      <DetailSection title={t("runs.title")} groupVariant="grid">
        <Detail icon={FlagIcon} label={t("runs.fields.status")}>
          <RunStatusBadge status={run.status} />
        </Detail>
        <Detail icon={UserIcon} label={t("runs.fields.trigger")}>
          {run.triggeredBy?.name ?? t(`trigger.${run.trigger}`)}
          {run.source && ` (${run.source})`}
        </Detail>
        <Detail icon={CalendarClockIcon} label={t("runs.fields.queuedAt")}>
          <LocalDate value={run.queuedAt} format="dateTime" />
        </Detail>
        <Detail icon={CirclePlayIcon} label={t("runs.fields.startedAt")}>
          {run.startedAt ? <LocalDate value={run.startedAt} format="dateTime" /> : "—"}
        </Detail>
        <Detail icon={CircleCheckBigIcon} label={t("runs.fields.finishedAt")}>
          {run.finishedAt ? <LocalDate value={run.finishedAt} format="dateTime" /> : "—"}
        </Detail>
        <Detail icon={TimerIcon} label={t("runs.fields.duration")}>
          {runDuration(run) ?? "—"}
        </Detail>
      </DetailSection>
      {run.error && (
        <DetailSection title={t("runs.fields.error")}>
          <Detail icon={CircleXIcon} label={t("runs.fields.error")} wide>
            <p className="text-sm text-destructive">{runError(run.error)}</p>
            {run.errorStack && (
              <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{run.errorStack}</pre>
            )}
          </Detail>
        </DetailSection>
      )}
      <DetailSection title={t("runs.logs")}>
        <Detail icon={ScrollTextIcon} label={t("runs.logs")} wide>
        {run.logs.length ? (
          <ol className="flex flex-col gap-1 font-mono text-xs">
            {run.logs.map((line) => (
              <li key={line.id} className={LEVEL_CLASS[line.level]}>
                <LocalDate value={line.at} format="dateTime" className="text-muted-foreground" />{" "}
                <span className="uppercase">{line.level}</span> {line.message}
                {line.data != null && <pre className="ml-4 whitespace-pre-wrap text-muted-foreground">{json(line.data)}</pre>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{t("runs.noLogs")}</p>
        )}
        </Detail>
      </DetailSection>
      {(run.payload != null || run.result != null) && (
        <DetailSection title={`${t("runs.fields.payload")} / ${t("runs.fields.result")}`} groupVariant="grid">
          <Detail icon={ArrowDownToLineIcon} label={t("runs.fields.payload")}>
            <pre className="overflow-auto text-xs">{run.payload == null ? "—" : json(run.payload)}</pre>
          </Detail>
          <Detail icon={ArrowUpFromLineIcon} label={t("runs.fields.result")}>
            <pre className="overflow-auto text-xs">{run.result == null ? "—" : json(run.result)}</pre>
          </Detail>
        </DetailSection>
      )}
    </>
  );
}

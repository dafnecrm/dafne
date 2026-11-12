"use client";

import type { ChangedField, ChangeOperation } from "@dafne/contracts";
import {
  CircleCheckIcon,
  CirclePlusIcon,
  CircleXIcon, HistoryIcon, RefreshCcwIcon, type LucideIcon
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Alert, AlertAction, AlertDescription } from "@dafne/frontend-ui/components/alert";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@dafne/frontend-ui/components/sheet";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@dafne/frontend-ui/components/trace";
import type { ChangeEntryJson, LoadChanges } from "../types.ts";
import { formatChangeValue } from "../values.ts";

/** How the sheet shows one of the resource's fields. */
export interface ChangeFieldConfig {
  /** The field's name, translated. */
  label: string;
  /** One of its values (default: formatChangeValue). */
  value?: (value: unknown) => ReactNode;
  /** The whole change, in place of "from → to" (e.g. "edited", "2 added"). */
  summary?: (change: ChangedField, operation: ChangeOperation) => ReactNode;
}

export const CHANGES_PAGE_SIZE = 20;

const OPERATION_ICONS: Record<ChangeOperation, LucideIcon> = {
  create: CirclePlusIcon,
  update: CircleCheckIcon,
  delete: CircleXIcon,
  transition: RefreshCcwIcon,
};

/**
 * A record's change log, in a sheet (opened by the page, e.g. from its
 * actions menu, with `open`): who did what and when, newest first, each
 * change expanding into the fields it touched. `fields` names them (in
 * this order; others follow, by their key). Loads when opened,
 * `CHANGES_PAGE_SIZE` changes at a time.
 */
export function ChangelogSheet({
  open,
  onOpenChange,
  load,
  fields,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  load: LoadChanges;
  fields: Record<string, ChangeFieldConfig>;
  description?: string;
}) {
  const t = useTranslations("changelog");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{description ?? t("description")}</SheetDescription>
        </SheetHeader>
        {/* The content unmounts when the sheet closes: each opening reloads. */}
        <ChangelogEntries load={load} fields={fields} />
      </SheetContent>
    </Sheet>
  );
}

/** The changes, loaded page by page. */
function ChangelogEntries({
  load,
  fields,
}: {
  load: LoadChanges;
  fields: Record<string, ChangeFieldConfig>;
}) {
  const t = useTranslations("changelog");
  const [page, setPage] = useState<{ items: ChangeEntryJson[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // The parent may pass a new function on every render: load the latest.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  const fetchPage = (offset: number) => {
    startTransition(async () => {
      try {
        const result = await loadRef.current({ limit: CHANGES_PAGE_SIZE, offset });
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setError(null);
        setPage((previous) => ({
          items: offset === 0 ? result.items : [...(previous?.items ?? []), ...result.items],
          total: result.total,
        }));
      } catch {
        setError(t("loadError"));
      }
    });
  };
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current(0);
  }, []);

  const items = page?.items ?? [];
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="xs" onClick={() => fetchPage(items.length)}>
              {t("retry")}
            </Button>
          </AlertAction>
        </Alert>
      )}
      {page && items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HistoryIcon />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {items.length > 0 && (
        <Trace className="gap-3">
          {items.map((entry, index) => (
            <ChangeTrace key={entry.id} entry={entry} fields={fields} defaultOpen={index === 0} />
          ))}
        </Trace>
      )}
      {pending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Spinner />
          {t("loading")}
        </p>
      ) : (
        page &&
        items.length < page.total && (
          <Button variant="outline" size="sm" className="self-center" onClick={() => fetchPage(items.length)}>
            {t("loadMore")}
          </Button>
        )
      )}
    </div>
  );
}

/** One change: who, what and when, expanding into the fields it touched. */
function ChangeTrace({
  entry,
  fields,
  defaultOpen,
}: {
  entry: ChangeEntryJson;
  fields: Record<string, ChangeFieldConfig>;
  defaultOpen: boolean;
}) {
  const t = useTranslations("changelog");
  const Icon = OPERATION_ICONS[entry.operation];
  const names = changedFields(entry.changes, fields);
  return (
    <TraceCollapsible defaultOpen={defaultOpen}>
      <TraceCollapsibleTrigger>
        {/* Title and date share a baseline (they differ in size); the icon stays centered. */}
        <TraceLine className="items-baseline">
          <TraceIcon className="self-center">
            <Icon />
          </TraceIcon>
          <TraceTitle>
            <span className="font-medium text-foreground">{entry.actor?.name ?? t("someone")}</span>{" "}
            {t(`operations.${entry.operation}`)}
          </TraceTitle>
          <TraceDescription className="text-xs proportional-nums tracking-tight">
            <LocalDate value={entry.changedAt} format="dateTime" />
          </TraceDescription>
        </TraceLine>
      </TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="flex flex-col gap-1.5 text-xs">
        {names.length === 0 ? (
          <p>{t("noFields")}</p>
        ) : (
          names.map((name) => (
            <p key={name}>
              <span className="font-medium text-foreground">{fields[name]?.label ?? name}</span>
              {": "}
              <FieldChange change={entry.changes[name]} operation={entry.operation} config={fields[name]} />
            </p>
          ))
        )}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  );
}

/** "from → to", only "to" for a create, or the field's own summary. */
function FieldChange({
  change,
  operation,
  config,
}: {
  change: ChangedField;
  operation: ChangeOperation;
  config?: ChangeFieldConfig;
}) {
  if (config?.summary) {
    return config.summary(change, operation);
  }
  const value = config?.value ?? formatChangeValue;
  if (operation === "create") {
    return <span className="text-foreground">{value(change.to)}</span>;
  }
  return (
    <>
      <span className="decoration-muted-foreground/50">{value(change.from)}</span>
      {" → "}
      <span className="text-foreground">{value(change.to)}</span>
    </>
  );
}

/** The changed fields: those of `fields` first, in its order, then the rest. */
function changedFields(changes: Record<string, ChangedField>, fields: Record<string, ChangeFieldConfig>) {
  const known = Object.keys(fields).filter((name) => name in changes);
  const others = Object.keys(changes)
    .filter((name) => !(name in fields))
    .sort();
  return [...known, ...others];
}

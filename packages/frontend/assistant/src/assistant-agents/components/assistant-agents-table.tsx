"use client";

import { BotIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import {
  createDataTableColumnHelper,
  DataTable,
  useDescribeFilters,
} from "@dafne/frontend-data-table/table";
import { LocalDate } from "@dafne/frontend-ui/components/local-date";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dafne/frontend-ui/components/empty";
import type { TableParams } from "@dafne/frontend-data-table";
import type { AssistantAgentsTableConfig } from "../assistant-agents-table.ts";
import type { ListedAssistantAgent } from "../types.ts";
import { AssistantAgentTableActions } from "./assistant-agent-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the assistant agents table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../assistant-agents-table.ts.
 */

const col = createDataTableColumnHelper<ListedAssistantAgent>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useAssistantAgentColumns(path: string) {
  const t = useTranslations();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("assistantAgents.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", {
          header: t("assistantAgents.fields.name"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.name}
            </Link>
          ),
        }),
        // Free text: at most two lines, so the table fits the screen. The
        // instructions are left to the detail page.
        col.accessor("description", {
          header: t("assistantAgents.fields.description"),
          cell: (info) => (
            <span className="line-clamp-2 max-w-md min-w-48 whitespace-normal text-muted-foreground">
              {info.getValue() ?? "—"}
            </span>
          ),
        }),
        // Who can use it: everyone, or its groups' names.
        col.accessor("audience", {
          header: t("assistantAgents.fields.audience"),
          enableSorting: false,
          cell: ({ row }) =>
            row.original.audience === "everyone"
              ? t("assistantAgents.audience.all")
              : row.original.groups.map((group) => group.name).join(", ") || "—",
        }),
        col.accessor("allowModelOverride", {
          header: t("assistantAgents.fields.allowModelOverride"),
          cell: (info) => t(info.getValue() ? "common.yes" : "common.no"),
        }),
        col.accessor("enabled", {
          header: t("assistantAgents.fields.enabled"),
          cell: (info) => t(info.getValue() ? "common.yes" : "common.no"),
        }),
        col.accessor("createdAt", {
          header: t("assistantAgents.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground tabular-nums font-medium"
            />
          ),
        }),
      ]),
    [t, path],
  );
}

const getRowId = (assistantAgent: ListedAssistantAgent) =>
  String(assistantAgent.id);

/**
 * Assistant agents list; the server page passes the app's config and one page
 * of assistant agents.
 */
export function AssistantAgentsTable({
  config,
  assistantAgents,
  total,
  params,
}: {
  config: AssistantAgentsTableConfig;
  assistantAgents: ListedAssistantAgent[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useAssistantAgentColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const assistantAgentActions = useCallback(
    (assistantAgent: ListedAssistantAgent) => (
      <AssistantAgentTableActions
        assistantAgent={assistantAgent}
        path={config.path}
      />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={assistantAgents}
      getRowId={getRowId}
      config={config}
      rowActions={assistantAgentActions}
      params={params}
      total={total}
      noun={t("assistantAgents.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BotIcon />
            </EmptyMedia>
            <EmptyTitle>{t("assistantAgents.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("assistantAgents.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("assistantAgents.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}

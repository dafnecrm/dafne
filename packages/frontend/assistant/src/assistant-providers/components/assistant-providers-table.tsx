"use client";

import { ServerIcon } from "lucide-react";
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
import { useOptionLabel } from "@dafne/frontend-ui/hooks/use-option-labels";
import type { TableParams } from "@dafne/frontend-data-table";
import {
  type AssistantProvidersTableConfig,
  ASSISTANT_PROVIDER_KIND_OPTIONS,
} from "../assistant-providers-table.ts";
import type { ListedAssistantProvider } from "../types.ts";
import { AssistantProviderTableActions } from "./assistant-provider-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the assistant providers table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../assistant-providers-table.ts.
 */

const col = createDataTableColumnHelper<ListedAssistantProvider>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useAssistantProviderColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("assistantProviders.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", { header: t("assistantProviders.fields.name") }),
        col.accessor("kind", {
          header: t("assistantProviders.fields.kind"),
          cell: (info) =>
            optionLabel(ASSISTANT_PROVIDER_KIND_OPTIONS, info.getValue()),
        }),
        col.accessor("baseUrl", {
          header: t("assistantProviders.fields.baseUrl"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("apiKeyEnv", {
          header: t("assistantProviders.fields.apiKeyEnv"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("enabled", {
          header: t("assistantProviders.fields.enabled"),
          cell: (info) => t(info.getValue() ? "common.yes" : "common.no"),
        }),
        col.accessor("createdAt", {
          header: t("assistantProviders.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground tabular-nums font-medium"
            />
          ),
        }),
      ]),
    [t, optionLabel, path],
  );
}

const getRowId = (assistantProvider: ListedAssistantProvider) =>
  String(assistantProvider.id);

/**
 * Assistant providers list; the server page passes the app's config and one page
 * of assistant providers.
 */
export function AssistantProvidersTable({
  config,
  assistantProviders,
  total,
  params,
}: {
  config: AssistantProvidersTableConfig;
  assistantProviders: ListedAssistantProvider[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useAssistantProviderColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const assistantProviderActions = useCallback(
    (assistantProvider: ListedAssistantProvider) => (
      <AssistantProviderTableActions
        assistantProvider={assistantProvider}
        path={config.path}
      />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={assistantProviders}
      getRowId={getRowId}
      config={config}
      rowActions={assistantProviderActions}
      params={params}
      total={total}
      noun={t("assistantProviders.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerIcon />
            </EmptyMedia>
            <EmptyTitle>{t("assistantProviders.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("assistantProviders.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("assistantProviders.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}

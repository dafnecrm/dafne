"use client";

import { CpuIcon } from "lucide-react";
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
import type { AssistantModelsTableConfig } from "../assistant-models-table.ts";
import type { ListedAssistantModel } from "../types.ts";
import { AssistantModelTableActions } from "./assistant-model-table-actions.tsx";
import Link from "next/link";

/*
 * Columns of the assistant models table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../assistant-models-table.ts.
 */

const col = createDataTableColumnHelper<ListedAssistantModel>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useAssistantModelColumns(path: string) {
  const t = useTranslations();
  // Labels of enum values, for their columns.
  const optionLabel = useOptionLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("assistantModels.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("label", { header: t("assistantModels.fields.label") }),
        col.accessor("supportsTools", {
          header: t("assistantModels.fields.supportsTools"),
          cell: (info) => t(info.getValue() ? "common.yes" : "common.no"),
        }),
        col.accessor("enabled", {
          header: t("assistantModels.fields.enabled"),
          cell: (info) => t(info.getValue() ? "common.yes" : "common.no"),
        }),
        col.accessor("createdAt", {
          header: t("assistantModels.fields.createdAt"),
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

const getRowId = (assistantModel: ListedAssistantModel) =>
  String(assistantModel.id);

/**
 * Assistant models list; the server page passes the app's config and one page
 * of assistant models.
 */
export function AssistantModelsTable({
  config,
  assistantModels,
  total,
  params,
}: {
  config: AssistantModelsTableConfig;
  assistantModels: ListedAssistantModel[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useAssistantModelColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const assistantModelActions = useCallback(
    (assistantModel: ListedAssistantModel) => (
      <AssistantModelTableActions
        assistantModel={assistantModel}
        path={config.path}
      />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={assistantModels}
      getRowId={getRowId}
      config={config}
      rowActions={assistantModelActions}
      params={params}
      total={total}
      noun={t("assistantModels.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CpuIcon />
            </EmptyMedia>
            <EmptyTitle>{t("assistantModels.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("assistantModels.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("assistantModels.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}

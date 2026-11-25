"use client";

import { FileTextIcon } from "lucide-react";
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
import Link from "next/link";
import type { DocumentTemplatesTableConfig } from "../document-templates-table.ts";
import type { ListedDocumentTemplate } from "../types.ts";
import { DocumentTemplateTableActions } from "./document-template-table-actions.tsx";
import { useResourceLabel } from "./use-resource-label.ts";

/*
 * Columns of the document templates table. Column ids double as the backend's
 * sort fields, so they must match `sortable` in ../document-templates-table.ts.
 */

const col = createDataTableColumnHelper<ListedDocumentTemplate>();

/**
 * Translated per language; memoized, so the table sees the same columns on
 * every render. Ids link to `<path>/<id>`, the detail page.
 */
function useDocumentTemplateColumns(path: string) {
  const t = useTranslations();
  const resourceLabel = useResourceLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("documentTemplates.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`${path}/${encodeURIComponent(row.original.id)}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {row.original.id}
            </Link>
          ),
        }),
        col.accessor("name", { header: t("documentTemplates.fields.name") }),
        col.accessor("resource", {
          header: t("documentTemplates.fields.resource"),
          cell: (info) => resourceLabel(info.getValue()),
        }),
        col.accessor("language", {
          header: t("documentTemplates.fields.language"),
          cell: (info) => t(`documentTemplates.languages.${info.getValue()}`),
        }),
        col.accessor("isDefault", {
          header: t("documentTemplates.fields.isDefault"),
          cell: (info) => t(info.getValue() ? "common.yes" : "common.no"),
        }),
        col.accessor("fileName", {
          header: t("documentTemplates.fields.fileName"),
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("size", {
          header: t("documentTemplates.fields.size"),
          meta: { className: "text-right" },
          cell: (info) => info.getValue() ?? "—",
        }),
        col.accessor("createdAt", {
          header: t("documentTemplates.fields.createdAt"),
          meta: { className: "text-right" },
          cell: (info) => (
            <LocalDate
              value={info.getValue()}
              className="text-muted-foreground"
            />
          ),
        }),
      ]),
    [t, resourceLabel, path],
  );
}

const getRowId = (documentTemplate: ListedDocumentTemplate) =>
  String(documentTemplate.id);

/**
 * Document templates list; the server page passes the app's config and one
 * page of document templates.
 */
export function DocumentTemplatesTable({
  documentTemplates,
  total,
  params,
  config,
}: {
  documentTemplates: ListedDocumentTemplate[];
  total: number;
  params: TableParams;
  config: DocumentTemplatesTableConfig;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useDocumentTemplateColumns(config.path);
  // Stable per path, so the table sees the same function on every render.
  const documentTemplateActions = useCallback(
    (documentTemplate: ListedDocumentTemplate) => (
      <DocumentTemplateTableActions documentTemplate={documentTemplate} path={config.path} />
    ),
    [config.path],
  );
  return (
    <DataTable
      columns={columns}
      data={documentTemplates}
      getRowId={getRowId}
      config={config}
      rowActions={documentTemplateActions}
      params={params}
      total={total}
      noun={t("documentTemplates.noun")}
      empty={
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon />
            </EmptyMedia>
            <EmptyTitle>{t("documentTemplates.empty.title")}</EmptyTitle>
            <EmptyDescription>
              {Object.keys(params.filters).length
                ? t("documentTemplates.empty.filtered", {
                    filter: describeFilters(params.filters, config.filters),
                  })
                : t("documentTemplates.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}

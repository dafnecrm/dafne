"use client";

import { FileTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
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
import { useResourceLabel } from "./use-resource-label";
import type { ListedDocumentTemplate } from "@/lib/document-templates";
import { documentTemplatesTable } from "@/lib/document-templates-table";
import { DocumentTemplateTableActions } from "./document-template-table-actions";
import Link from "next/link";

/*
 * Columns of the document templates table. Column ids double as the backend's
 * sort fields, so they must match documentTemplatesTable.sortable in
 * lib/document-templates-table.ts.
 */

const col = createDataTableColumnHelper<ListedDocumentTemplate>();

/** Translated per language; memoized, so the table sees the same columns on every render. */
function useDocumentTemplateColumns() {
  const t = useTranslations();
  const resourceLabel = useResourceLabel();
  return useMemo(
    () =>
      col.columns([
        col.accessor("id", {
          header: t("documentTemplates.fields.id"),
          cell: ({ row }) => (
            <Link
              href={`/document-templates/${encodeURIComponent(row.original.id)}`}
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
    [t, resourceLabel],
  );
}

// Module scope, so the table sees the same function on every render.
const documentTemplateActions = (documentTemplate: ListedDocumentTemplate) => (
  <DocumentTemplateTableActions documentTemplate={documentTemplate} />
);

const getRowId = (documentTemplate: ListedDocumentTemplate) =>
  String(documentTemplate.id);

/** Document templates list; the server page passes one page of document templates. */
export function DocumentTemplatesTable({
  documentTemplates,
  total,
  params,
}: {
  documentTemplates: ListedDocumentTemplate[];
  total: number;
  params: TableParams;
}) {
  const t = useTranslations();
  const describeFilters = useDescribeFilters();
  const columns = useDocumentTemplateColumns();
  return (
    <DataTable
      columns={columns}
      data={documentTemplates}
      getRowId={getRowId}
      config={documentTemplatesTable}
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
                    filter: describeFilters(
                      params.filters,
                      documentTemplatesTable.filters,
                    ),
                  })
                : t("documentTemplates.empty.none")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    />
  );
}

import {
  LANGUAGES,
  type DocumentTemplateFilterField,
  type DocumentTemplateSortField,
} from "@dafne/contracts";
import {
  defineDataTable,
  type DataTableConfig,
} from "@dafne/frontend-data-table";
import type { DocumentTemplatesMessageKey } from "./messages/index.ts";

/** Sort of the list without `?sort=`. */
export const DOCUMENT_TEMPLATES_DEFAULT_SORT = { id: "id", desc: true };

/** A document templates table's config: its path is always set (detail links use it). */
export type DocumentTemplatesTableConfig = DataTableConfig & { path: string };

export interface DocumentTemplatesTableOptions {
  /** Path of the app's document templates list page, e.g. "/document-templates". */
  path: string;
}

/**
 * The document templates table: plain data with no server-only imports, so
 * the server page (reads the URL) and the client table (builds links) share
 * it. Each app calls it once at module scope with its own list path. Sort
 * and filter fields are checked against the backend's contract (type-only
 * import: keeps Zod out of the list page's bundle); every filter matches
 * text the field contains, and they combine with AND.
 */
export function defineDocumentTemplatesTable({
  path,
}: DocumentTemplatesTableOptions): DocumentTemplatesTableConfig {
  const config = defineDataTable({
    path,
    // The backend allows up to 100.
    pageSizes: [10, 20, 50],
    sortable: [
      "id",
      "name",
      "resource",
      "language",
      "isDefault",
      "fileName",
      "size",
      "createdAt",
      "updatedAt",
    ] satisfies DocumentTemplateSortField[],
    defaultSort: DOCUMENT_TEMPLATES_DEFAULT_SORT,
    // { field: "…" satisfies DocumentTemplateFilterField, label: "…" satisfies DocumentTemplatesMessageKey }, added with the fields.
    filters: [
      {
        field: "id" satisfies DocumentTemplateFilterField,
        label: "documentTemplates.fields.id" satisfies DocumentTemplatesMessageKey,
      },
      {
        field: "name" satisfies DocumentTemplateFilterField,
        label: "documentTemplates.fields.name" satisfies DocumentTemplatesMessageKey,
      },
      {
        field: "resource" satisfies DocumentTemplateFilterField,
        label: "documentTemplates.fields.resource" satisfies DocumentTemplatesMessageKey,
      },
      {
        field: "language" satisfies DocumentTemplateFilterField,
        label: "documentTemplates.fields.language" satisfies DocumentTemplatesMessageKey,
        options: LANGUAGES.map((language) => ({
          value: language,
          label: `documentTemplates.languages.${language}` satisfies DocumentTemplatesMessageKey,
        })),
      },
      {
        field: "isDefault" satisfies DocumentTemplateFilterField,
        label: "documentTemplates.fields.isDefault" satisfies DocumentTemplatesMessageKey,
        options: [
          { value: "true", label: "common.yes" },
          { value: "false", label: "common.no" },
        ],
      },
      {
        field: "fileName" satisfies DocumentTemplateFilterField,
        label: "documentTemplates.fields.fileName" satisfies DocumentTemplatesMessageKey,
      },
    ],
  });
  return { ...config, path };
}

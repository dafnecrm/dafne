import type {
  DocumentTemplateSortField,
  DocumentTemplateFilterField,
} from "@dafne/contracts";
import { defineDataTable } from "@dafne/frontend-data-table";

/**
 * The document templates table: plain data with no server-only imports (unlike
 * lib/document-templates.ts), so it's shared by the server page (reads the URL)
 * and the client table (builds links). Sort and filter fields are checked
 * against the backend's contract (type-only import: keeps Zod out of the
 * list page's bundle); every filter matches text the field contains, and
 * they combine with AND.
 */
export const documentTemplatesTable = defineDataTable({
  path: "/document-templates",
  // The backend allows up to 100.
  pageSizes: [10, 20, 50],
  sortable: [
    "id",
    "name",
    "resource",
    "isDefault",
    "fileName",
    "size",
    "createdAt",
    "updatedAt",
  ] satisfies DocumentTemplateSortField[],
  defaultSort: { id: "id", desc: true },
  // { field: "…" satisfies DocumentTemplateFilterField, label: "…" }, added with the fields.
  filters: [
    {
      field: "id" satisfies DocumentTemplateFilterField,
      label: "documentTemplates.fields.id",
    },
    {
      field: "name" satisfies DocumentTemplateFilterField,
      label: "documentTemplates.fields.name",
    },
    {
      field: "resource" satisfies DocumentTemplateFilterField,
      label: "documentTemplates.fields.resource",
    },
    {
      field: "isDefault" satisfies DocumentTemplateFilterField,
      label: "documentTemplates.fields.isDefault",
      options: [
        { value: "true", label: "common.yes" },
        { value: "false", label: "common.no" },
      ],
    },
    {
      field: "fileName" satisfies DocumentTemplateFilterField,
      label: "documentTemplates.fields.fileName",
    },
  ],
});

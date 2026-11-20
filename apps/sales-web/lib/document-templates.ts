import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";
import { backendFetch } from "@dafne/frontend-api/server";
import type { TableFilters, TableSort } from "@dafne/frontend-data-table";
import { documentTemplatesTable } from "./document-templates-table";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedDocumentTemplate = Json<contracts.ListedDocumentTemplate>;
export type DocumentTemplatesList = Json<contracts.DocumentTemplatesList>;
export type DocumentTemplateUser = Json<contracts.DocumentTemplateUser>;
export type DocumentTemplateDetail = Json<contracts.DocumentTemplateDetail>;

/**
 * Calls the backend's GET /document-templates/:id. Throws a BackendError with
 * status 404 when the document template doesn't exist or was deleted.
 */
export async function getDocumentTemplate(
  id: string,
): Promise<DocumentTemplateDetail> {
  const res = await backendFetch(
    `/document-templates/${encodeURIComponent(id)}`,
  );
  return res.json();
}

/** Calls the backend's GET /document-templates (deleted document templates are left out). */
export async function listDocumentTemplates({
  limit,
  offset,
  filters = {},
  sort = documentTemplatesTable.defaultSort,
}: {
  limit: number;
  offset: number;
  filters?: TableFilters;
  sort?: TableSort;
}): Promise<DocumentTemplatesList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  for (const [field, value] of Object.entries(filters)) {
    query.set(field, value);
  }
  query.set("sortBy", sort.id);
  query.set("sortDirection", sort.desc ? "desc" : "asc");
  const res = await backendFetch(`/document-templates?${query}`);
  return res.json();
}

export type DocumentResource = Json<contracts.DocumentResource>;
export type DocumentPlaceholder = Json<contracts.DocumentPlaceholder>;
export type DocumentTemplateError = Json<contracts.DocumentTemplateError>;

/** Calls GET /document-templates/resources: what templates can be made for, with their tags. */
export async function listDocumentResources(): Promise<DocumentResource[]> {
  const res = await backendFetch("/document-templates/resources");
  return res.json();
}

/** The templates with a file of `resource` (e.g. "quotation"), defaults first, for a PDF menu. */
export async function listTemplatesFor(resource: string): Promise<ListedDocumentTemplate[]> {
  const query = new URLSearchParams({ resource, limit: "100", sortBy: "isDefault", sortDirection: "desc" });
  const res = await backendFetch(`/document-templates?${query}`);
  const page = (await res.json()) as DocumentTemplatesList;
  return page.items.filter((template) => template.fileName);
}

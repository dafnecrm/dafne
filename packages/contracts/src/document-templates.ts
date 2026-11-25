import { z } from "zod";
import {
  pageQuery,
  SORT_DIRECTIONS,
  requiredText,
  LANGUAGES,
  type Page,
} from "./common.ts";
import { msg } from "./messages/index.ts";

/* ---------- Requests ---------- */

/** Values of document template language: the language of its text and formats. */
export const DOCUMENT_TEMPLATE_LANGUAGES = LANGUAGES;
export type DocumentTemplateLanguage =
  (typeof DOCUMENT_TEMPLATE_LANGUAGES)[number];

/**
 * Body of POST /document-templates and PUT /document-templates/:id. PUT replaces the
 * whole document template: omitted optional fields are cleared.
 */
export const documentTemplateBodySchema = z.strictObject({
  name: requiredText(120, msg("documentTemplates.name.required")),
  resource: requiredText(60, msg("documentTemplates.resource.required")),
  language: z
    .enum(DOCUMENT_TEMPLATE_LANGUAGES, {
      error: msg("documentTemplates.language.required"),
    }),
  isDefault: z.boolean().optional(),
});

/** What a client sends: blank optional fields may be "", null or missing. */
export type DocumentTemplateBodyInput = z.input<
  typeof documentTemplateBodySchema
>;
/** What the backend gets after validation: blanks are null. */
export type DocumentTemplateBody = z.output<typeof documentTemplateBodySchema>;

/** Document template fields the list can be sorted by. */
export const DOCUMENT_TEMPLATE_SORT_FIELDS = [
  "id",
  "name",
  "resource",
  "language",
  "isDefault",
  "fileName",
  "size",
  "createdAt",
  "updatedAt",
] as const;
export type DocumentTemplateSortField =
  (typeof DOCUMENT_TEMPLATE_SORT_FIELDS)[number];

/**
 * Document template fields the list can be filtered by, each a query param of
 * its own. Filters combine with AND and match text the field contains
 * (the id and the keys to other records match exactly).
 */
export const DOCUMENT_TEMPLATE_FILTER_FIELDS = [
  "id",
  "name",
  "resource",
  "language",
  "isDefault",
  "fileName",
] as const;
export type DocumentTemplateFilterField =
  (typeof DOCUMENT_TEMPLATE_FILTER_FIELDS)[number];

/** Query string of GET /document-templates. Deleted document templates are never listed. */
export const listDocumentTemplatesQuerySchema = z.strictObject({
  ...pageQuery,
  id: z
    .string()
    .regex(/^\s*\d{0,9}\s*$/)
    .optional(),
  name: z.string().max(120).optional(),
  resource: z.string().max(60).optional(),
  language: z.enum(DOCUMENT_TEMPLATE_LANGUAGES).optional(),
  isDefault: z.enum(["true", "false"]).optional(),
  fileName: z.string().max(255).optional(),
  /** Defaults to id. */
  sortBy: z.enum(DOCUMENT_TEMPLATE_SORT_FIELDS).optional(),
  /** Defaults to desc. */
  sortDirection: z.enum(SORT_DIRECTIONS).optional(),
});
export type ListDocumentTemplatesQuery = z.output<
  typeof listDocumentTemplatesQuerySchema
>;

/* ---------- Responses (dates as Date; clients get Json<T>) ---------- */

/** A document template in GET /document-templates. */
export interface ListedDocumentTemplate {
  id: number;
  name: string;
  resource: string;
  language: DocumentTemplateLanguage;
  isDefault: boolean;
  fileName: string | null;
  size: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Response of GET /document-templates. */
export type DocumentTemplatesList = Page<ListedDocumentTemplate>;

/** A user who created or last updated a document template; null if since removed. */
export interface DocumentTemplateUser {
  id: string;
  name: string;
}

/** Response of GET /document-templates/:id, POST /document-templates and PUT /document-templates/:id. */
export interface DocumentTemplateDetail extends ListedDocumentTemplate {
  createdBy: DocumentTemplateUser | null;
  updatedBy: DocumentTemplateUser | null;
  /** Always null: deleted document templates aren't returned. */
  deletedAt: Date | null;
}

/* ---------- Files and documents ---------- */

/** The largest .docx PUT /document-templates/:id/file accepts. */
export const DOCUMENT_TEMPLATE_MAX_BYTES = 5 * 1024 * 1024;

/** The media type of a Word document. */
export const DOCX_MEDIA_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * A tag a template can use, as written in Word: a value (`{customer.name}`),
 * or a loop (`{#items}…{/items}`, a table row repeated per item) with the
 * tags its body can use.
 */
export interface DocumentPlaceholder {
  /** The path, e.g. "customer.name" or "items". */
  tag: string;
  /** For a loop: the tags of each element. */
  loop?: DocumentPlaceholder[];
}

/** A resource documents can be made for, in GET /document-templates/resources. */
export interface DocumentResource {
  /** E.g. "quotation", the `resource` of its templates. */
  resource: string;
  placeholders: DocumentPlaceholder[];
}

/** An error of an uploaded template (422 of PUT /document-templates/:id/file). */
export interface DocumentTemplateError {
  /** The tag at fault, when docxtemplater knows it. */
  tag: string | null;
  /** What is wrong (in English, from docxtemplater). */
  explanation: string;
}

/** Query string of GET /documents/:resource/:id/pdf: the template, else the resource's default. */
export const renderDocumentQuerySchema = z.strictObject({
  template: z
    .string()
    .regex(/^\d{1,9}$/)
    .transform(Number)
    .optional(),
});
export type RenderDocumentQuery = z.output<typeof renderDocumentQuerySchema>;

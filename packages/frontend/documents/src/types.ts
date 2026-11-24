import type * as contracts from "@dafne/contracts";
import type { Json } from "@dafne/contracts";

/*
 * API types come from the backend's contracts (dates arrive as strings,
 * hence Json<...>), so they can't drift from what the backend returns.
 */
export type ListedDocumentTemplate = Json<contracts.ListedDocumentTemplate>;
export type DocumentTemplatesList = Json<contracts.DocumentTemplatesList>;
export type DocumentTemplateUser = Json<contracts.DocumentTemplateUser>;
export type DocumentTemplateDetail = Json<contracts.DocumentTemplateDetail>;
export type DocumentResource = Json<contracts.DocumentResource>;
export type DocumentPlaceholder = Json<contracts.DocumentPlaceholder>;
export type DocumentTemplateError = Json<contracts.DocumentTemplateError>;

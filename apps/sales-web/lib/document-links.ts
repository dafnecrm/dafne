/* Links to the documents the API makes, safe in client code. */

/** The PDF of a record (`/api/documents/quotation/42/pdf`), from `template` or the default one. */
export function documentPdfHref(resource: string, id: string | number, template?: number) {
  const query = template === undefined ? "" : `?template=${template}`;
  return `/api/documents/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/pdf${query}`;
}

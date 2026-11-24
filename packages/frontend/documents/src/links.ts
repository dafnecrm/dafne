/*
 * Links to the routes of ./routes.ts, safe in client code. Each app mounts
 * them at these paths: app/[locale]/api/document-templates/[id]/{file,preview}
 * and app/[locale]/api/documents/[resource]/[id]/pdf.
 */

/** A template's routes: `${base}/file` (download, upload), `${base}/preview` (PDF). */
export function documentTemplateApiBase(id: string | number) {
  return `/api/document-templates/${encodeURIComponent(id)}`;
}

/** The PDF of a record (`/api/documents/quotation/42/pdf`), from `template` or the default one. */
export function documentPdfHref(resource: string, id: string | number, template?: number) {
  const query = template === undefined ? "" : `?template=${template}`;
  return `/api/documents/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/pdf${query}`;
}

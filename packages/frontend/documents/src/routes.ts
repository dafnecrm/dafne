import { NextResponse } from "next/server";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { relayFile } from "./relay-file.ts";

/*
 * Route handlers the app re-exports at the paths of ./links.ts: the
 * browser can't call the API itself (backendFetch adds the session cookie
 * and the language), and server actions take bodies up to 1 MB.
 *
 *   // app/[locale]/api/document-templates/[id]/file/route.ts
 *   export { getTemplateFile as GET, putTemplateFile as PUT } from "@dafne/frontend-documents/routes";
 */

interface Context<P> {
  params: Promise<P>;
}

/** GET /api/document-templates/:id/file: downloads a template's .docx. */
export async function getTemplateFile(_request: Request, { params }: Context<{ id: string }>) {
  return relayFile(`/document-templates/${encodeURIComponent((await params).id)}/file`);
}

/**
 * PUT /api/document-templates/:id/file: uploads a template's .docx
 * (multipart, field `file`). Answers the template, or `{ error, errors }`
 * with the backend's status (errors: the tags at fault).
 */
export async function putTemplateFile(request: Request, { params }: Context<{ id: string }>) {
  const id = (await params).id;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const body = new FormData();
  body.append("file", file, file.name);
  try {
    const res = await backendFetch(`/document-templates/${encodeURIComponent(id)}/file`, {
      method: "PUT",
      body,
    });
    return NextResponse.json(await res.json());
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json(
        { error: error.message, errors: error.body.errors ?? [] },
        { status: error.status },
      );
    }
    throw error;
  }
}

/** GET /api/document-templates/:id/preview: a template filled with sample data, as a PDF. */
export async function getTemplatePreview(_request: Request, { params }: Context<{ id: string }>) {
  return relayFile(`/document-templates/${encodeURIComponent((await params).id)}/preview`);
}

/** GET /api/documents/:resource/:id/pdf: the PDF of a record, from `?template=` or its resource's default template. */
export async function getDocumentPdf(request: Request, { params }: Context<{ resource: string; id: string }>) {
  const { resource, id } = await params;
  const template = new URL(request.url).searchParams.get("template");
  const query = template && /^\d{1,9}$/.test(template) ? `?template=${template}` : "";
  return relayFile(`/documents/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/pdf${query}`);
}

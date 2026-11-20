import { NextResponse } from "next/server";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { relayFile } from "@/lib/files";

/** Downloads a template's .docx. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/[locale]/api/document-templates/[id]/file">,
) {
  return relayFile(`/document-templates/${encodeURIComponent((await params).id)}/file`);
}

/**
 * Uploads a template's .docx (multipart, field `file`). A route, not a
 * server action: actions take bodies up to 1 MB. Answers the template, or
 * `{ error, errors }` with the backend's status (errors: the tags at fault).
 */
export async function PUT(
  request: Request,
  { params }: RouteContext<"/[locale]/api/document-templates/[id]/file">,
) {
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

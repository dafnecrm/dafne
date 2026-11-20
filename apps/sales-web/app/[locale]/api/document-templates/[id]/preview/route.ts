import { relayFile } from "@/lib/files";

/** A template filled with sample data, as a PDF. */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/[locale]/api/document-templates/[id]/preview">,
) {
  return relayFile(`/document-templates/${encodeURIComponent((await params).id)}/preview`);
}

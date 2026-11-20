import { relayFile } from "@/lib/files";

/** The PDF of a record, from `?template=` or its resource's default template. */
export async function GET(
  request: Request,
  { params }: RouteContext<"/[locale]/api/documents/[resource]/[id]/pdf">,
) {
  const { resource, id } = await params;
  const template = new URL(request.url).searchParams.get("template");
  const query = template && /^\d{1,9}$/.test(template) ? `?template=${template}` : "";
  return relayFile(`/documents/${encodeURIComponent(resource)}/${encodeURIComponent(id)}/pdf${query}`);
}

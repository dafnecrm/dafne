import { listTemplatesFor } from "@/lib/document-templates";
import { DocumentPdfMenu } from "./document-pdf-menu";

/**
 * The PDF of a record of `resource` (e.g. "quotation"), from the templates
 * admins uploaded for it: nothing while there is none.
 */
export async function DocumentPdfButton({ resource, id }: { resource: string; id: string | number }) {
  const templates = await listTemplatesFor(resource);
  if (!templates.length) {
    return null;
  }
  return (
    <DocumentPdfMenu
      resource={resource}
      id={id}
      templates={templates.map(({ id: templateId, name, isDefault }) => ({ id: templateId, name, isDefault }))}
    />
  );
}

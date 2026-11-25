import { listTemplatesFor } from "../server.ts";
import { DocumentPdfMenu } from "./document-pdf-menu.tsx";

/**
 * A server component: the PDF of a record of `resource` (e.g. "quotation"), from the templates
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
      templates={templates.map(({ id: templateId, name, isDefault, language }) => ({ id: templateId, name, isDefault, language }))}
    />
  );
}

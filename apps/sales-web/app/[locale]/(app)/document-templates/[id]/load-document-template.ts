import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getDocumentTemplate } from "@dafne/frontend-documents/server";
import { requireUser } from "@/lib/session";

/** The document template for a page, or the 404 page if missing or deleted. */
export async function loadDocumentTemplate(id: string) {
  await requireUser();
  try {
    return await getDocumentTemplate(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

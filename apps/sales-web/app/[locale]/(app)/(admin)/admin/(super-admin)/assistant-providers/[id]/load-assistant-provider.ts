import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getAssistantProvider } from "@dafne/frontend-assistant/assistant-providers/server";
import { requireUser } from "@/lib/session";

/** The assistant provider for a page, or the 404 page if missing or deleted. */
export async function loadAssistantProvider(id: string) {
  await requireUser();
  try {
    return await getAssistantProvider(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

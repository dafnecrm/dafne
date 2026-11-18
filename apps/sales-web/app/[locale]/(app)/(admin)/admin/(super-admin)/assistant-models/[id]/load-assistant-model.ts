import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getAssistantModel } from "@dafne/frontend-assistant/assistant-models/server";
import { requireUser } from "@/lib/session";

/** The assistant model for a page, or the 404 page if missing or deleted. */
export async function loadAssistantModel(id: string) {
  await requireUser();
  try {
    return await getAssistantModel(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

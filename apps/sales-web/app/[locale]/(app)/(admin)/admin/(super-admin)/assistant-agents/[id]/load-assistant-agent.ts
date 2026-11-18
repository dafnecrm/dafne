import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getAssistantAgent } from "@dafne/frontend-assistant/assistant-agents/server";
import { requireUser } from "@/lib/session";

/** The assistant agent for a page, or the 404 page if missing or deleted. */
export async function loadAssistantAgent(id: string) {
  await requireUser();
  try {
    return await getAssistantAgent(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

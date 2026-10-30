import { notFound } from "next/navigation";
import { BackendError } from "@/lib/backend";
import { getTask } from "@/lib/tasks";
import { requireUser } from "@/lib/session";

/** The task for a page, or the 404 page if missing or deleted. */
export async function loadTask(id: string) {
  await requireUser();
  try {
    return await getTask(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}

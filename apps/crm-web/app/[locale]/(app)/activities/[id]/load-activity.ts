import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getActivity } from "@/lib/activities";
import { requireUser } from "@/lib/session";

/** The activity for a page, or the 404 page if missing or deleted. */
export async function loadActivity(id: string) {
  await requireUser();
  try {
    return await getActivity(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}

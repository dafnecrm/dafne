import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { requireUser } from "@/lib/session";
import { getActivity } from "@dafne/frontend-activities/server";

/** The activity for a page, or the 404 page if missing or deleted. */
export async function loadActivity(id: string) {
  await requireUser();
  try {
    return await getActivity(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

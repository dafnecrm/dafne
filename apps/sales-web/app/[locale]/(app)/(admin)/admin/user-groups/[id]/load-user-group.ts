import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getUserGroup } from "@dafne/frontend-user-groups/server";
import { requireUser } from "@/lib/session";

/** The user group for a page, or the 404 page if missing or deleted. */
export async function loadUserGroup(id: string) {
  await requireUser();
  try {
    return await getUserGroup(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

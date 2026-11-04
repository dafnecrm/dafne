import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getCustomer } from "@/lib/customers";
import { requireUser } from "@/lib/session";

/** The customer for a page, or the 404 page if missing or deleted. */
export async function loadCustomer(id: string) {
  await requireUser();
  try {
    return await getCustomer(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}

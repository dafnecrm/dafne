import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getOrder } from "@dafne/frontend-sales-orders/server";
import { requireUser } from "@/lib/session";

/** The order for a page, or the 404 page if missing or deleted. */
export async function loadOrder(id: string) {
  await requireUser();
  try {
    return await getOrder(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}

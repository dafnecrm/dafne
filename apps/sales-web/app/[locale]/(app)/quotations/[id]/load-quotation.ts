import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getQuotation } from "@dafne/frontend-sales-orders/quotations/server";
import { requireUser } from "@/lib/session";

/** The quotation for a page, or the 404 page if missing or deleted. */
export async function loadQuotation(id: string) {
  await requireUser();
  try {
    return await getQuotation(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

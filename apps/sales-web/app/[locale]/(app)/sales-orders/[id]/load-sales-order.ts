import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getSalesOrder } from "@dafne/frontend-sales-orders/server";
import { requireUser } from "@/lib/session";

/** The sales order for a page, or the 404 page if missing or deleted. */
export async function loadSalesOrder(id: string) {
  await requireUser();
  try {
    return await getSalesOrder(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

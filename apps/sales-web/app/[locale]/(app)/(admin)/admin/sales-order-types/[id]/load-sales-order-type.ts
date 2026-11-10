import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getSalesOrderType } from "@dafne/frontend-sales-orders/sales-order-types/server";
import { requireUser } from "@/lib/session";

/** The sales order type for a page, or the 404 page if missing or deleted. */
export async function loadSalesOrderType(id: string) {
  await requireUser();
  try {
    return await getSalesOrderType(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}

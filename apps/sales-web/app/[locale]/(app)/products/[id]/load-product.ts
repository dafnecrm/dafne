import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getProduct } from "@dafne/frontend-products/server";
import { requireUser } from "@/lib/session";

/** The product for a page, or the 404 page if missing or deleted. */
export async function loadProduct(id: string) {
  await requireUser();
  try {
    return await getProduct(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}

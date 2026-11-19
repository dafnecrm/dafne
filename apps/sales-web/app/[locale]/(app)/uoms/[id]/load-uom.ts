import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getUom } from "@dafne/frontend-products/uoms/server";
import { requireUser } from "@/lib/session";

/** The uom for a page, or the 404 page if missing or deleted. */
export async function loadUom(id: string) {
  await requireUser();
  try {
    return await getUom(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getUomConversion } from "@dafne/frontend-products/uom-conversions/server";
import { requireUser } from "@/lib/session";

/** The uom conversion for a page, or the 404 page if missing or deleted. */
export async function loadUomConversion(id: string) {
  await requireUser();
  try {
    return await getUomConversion(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}

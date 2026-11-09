"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { salesOrderSchema, type SalesOrderFormValues } from "./schema.ts";
import { getSalesOrderItem } from "./server.ts";
import type { SalesOrderDetail, SalesOrderDetailItem } from "./types.ts";
import { SalesOrderItem } from "@dafne/contracts";

/*
 * Sales order mutations shared by the apps. The backend checks the session (forwarded by
 * backendFetch) on every call, since these can be invoked by any POST.
 */

export interface ActionError {
  error: string;
}

/** The error to show; the backend's own message is already translated. */
async function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) throw error;
  const t = await getTranslations();
  if (error.status === 401) return t("common.errors.sessionExpired");
  if (error.status === 404) return t("salesOrders.notFound");
  return error.message || t("common.errors.generic");
}

/**
 * Creates a sales order (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's sales orders list). Returns an
 * error message when it fails.
 */
export async function saveSalesOrder(
  id: number | null,
  values: SalesOrderFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) throw new Error(`Invalid path: ${path}`);
  const parsed = salesOrderSchema.safeParse(values);
  if (!parsed.success)
    return { error: (await getTranslations())("common.errors.invalid") };

  let savedId: number;
  try {
    const res = await backendFetch(
      id ? `/sales-orders/${encodeURIComponent(id)}` : "/sales-orders",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as SalesOrderDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the order as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes a sales order (logically: the backend sets deletedAt). The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteSalesOrder(id: number): Promise<ActionError | null> {
  try {
    await backendFetch(`/sales-orders/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

/**
 * The item at `position` of a sales order, for the item sheet (a client
 * component: backendFetch only runs on the server). Null when it doesn't
 * exist or its order was deleted.
 */
export async function fetchSalesOrderItem(
  salesOrderId: number,
  position: number,
): Promise<SalesOrderItem | null> {
  try {
    return await getSalesOrderItem(salesOrderId, position);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return null;
    throw error;
  }
}

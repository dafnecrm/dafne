"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import type { OrderDetail } from "@/lib/orders";
import { orderSchema, type OrderFormValues } from "./schema";

/*
 * Order mutations. The backend checks the session (forwarded by
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
  if (error.status === 404) return t("orders.notFound");
  return error.message || t("common.errors.generic");
}

/**
 * Creates an order (no `id`) or replaces one, then opens its page.
 * Returns an error message when it fails.
 */
export async function saveOrder(
  id: string | null,
  values: OrderFormValues,
): Promise<ActionError> {
  const parsed = orderSchema.safeParse(values);
  if (!parsed.success)
    return { error: (await getTranslations())("common.errors.invalid") };

  let savedId: string;
  try {
    const res = await backendFetch(
      id ? `/orders/${encodeURIComponent(id)}` : "/orders",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as OrderDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/orders/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes an order (logically: the backend sets deletedAt). The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteOrder(id: string): Promise<ActionError | null> {
  try {
    await backendFetch(`/orders/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

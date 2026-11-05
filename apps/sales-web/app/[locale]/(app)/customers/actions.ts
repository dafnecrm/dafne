"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import type { CustomerDetail } from "@/lib/customers";
import { customerSchema, type CustomerFormValues } from "./schema";

/*
 * Customer mutations. The backend checks the session (forwarded by
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
  if (error.status === 404) return t("customers.notFound");
  return error.message || t("common.errors.generic");
}

/**
 * Creates a customer (no `id`) or replaces one, then opens its page.
 * Returns an error message when it fails.
 */
export async function saveCustomer(
  id: number | null,
  values: CustomerFormValues,
): Promise<ActionError> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success)
    return { error: (await getTranslations())("common.errors.invalid") };

  let savedId: number;
  try {
    const res = await backendFetch(
      id ? `/customers/${encodeURIComponent(id)}` : "/customers",
      {
        method: id ? "PUT" : "POST",
        // Blank optional fields are sent empty; the backend stores null.
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as CustomerDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/customers/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes a customer (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteCustomer(id: number): Promise<ActionError | null> {
  try {
    await backendFetch(`/customers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

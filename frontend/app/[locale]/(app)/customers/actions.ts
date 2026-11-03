"use server";

import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@/lib/backend";
import type { CustomerDetail } from "@/lib/customers";
import { customerSchema, type CustomerFormValues } from "./schema";

/*
 * Customer mutations. The backend checks the session (forwarded by
 * backendFetch) on every call, since these can be invoked by any POST.
 */

export interface ActionError {
  error: string;
}

function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) throw error;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 404) return "This customer no longer exists.";
  return error.message || "Something went wrong. Please try again.";
}

/**
 * Creates a customer (no `id`) or replaces one, then opens its page.
 * Returns an error message when it fails.
 */
export async function saveCustomer(
  id: string | null,
  values: CustomerFormValues,
): Promise<ActionError> {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: "Some fields are not valid." };

  let savedId: string;
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
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/customers/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes a customer (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteCustomer(id: string): Promise<ActionError | null> {
  try {
    await backendFetch(`/customers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { customerSchema, type CustomerFormValues } from "./schema.ts";
import { getCustomer, listCustomers } from "./server.ts";
import type { CustomerDetail, ListedCustomer } from "./types.ts";

/*
 * Customer mutations shared by the apps. The backend checks the session
 * (forwarded by backendFetch) on every call, since these can be invoked by
 * any POST.
 */

export interface ActionError {
  error: string;
}

/** The error to show; the backend's own message is already translated. */
async function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) {
    throw error;
  }
  const t = await getTranslations();
  if (error.status === 401) {
    return t("common.errors.sessionExpired");
  }
  if (error.status === 404) {
    return t("customers.notFound");
  }
  return error.message || t("common.errors.generic");
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

/**
 * Creates a customer (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's customers list). Returns an error
 * message when it fails.
 */
export async function saveCustomer(
  id: number | null,
  values: CustomerFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid") };
  }

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
  redirect(`${path}/${encodeURIComponent(savedId)}`);
}

/** A customer as a picker shows it: enough to name it. */
export type CustomerOption = Pick<ListedCustomer, "id" | "name">;

/**
 * The customers whose name contains `name` (all when blank), sorted by
 * name: the first `limit`, for a picker that searches as the user types
 * (CustomerSelect). Server actions, since backendFetch only runs on the
 * server.
 */
export async function searchCustomers({
  name,
  limit = 20,
}: {
  name: string;
  limit?: number;
}): Promise<CustomerOption[]> {
  const query = name.trim();
  const list = await listCustomers({
    // The backend allows up to 100.
    limit: Math.min(Math.max(limit, 1), 100),
    offset: 0,
    filters: query ? { name: query } : {},
  });
  return list.customers.map(({ id, name }) => ({ id, name }));
}

/**
 * The customer with this `id`, for a picker that already has a value
 * (e.g. editing an order); null when it doesn't exist or was deleted.
 */
export async function getCustomerOption(
  id: string,
): Promise<CustomerOption | null> {
  try {
    const { name } = await getCustomer(id);
    return { id: Number(id), name };
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

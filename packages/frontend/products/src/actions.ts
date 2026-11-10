"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { productSchema, type ProductFormValues } from "./schema.ts";
import type { ListedProduct, ProductDetail } from "./types.ts";
import { getProduct, listProducts } from "./server.ts";

/*
 * Product mutations shared by the apps. The backend checks the session (forwarded by
 * backendFetch) on every call, since these can be invoked by any POST.
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
    return t("products.notFound");
  }
  return error.message || t("common.errors.generic");
}

/**
 * Creates a product (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's products list). Returns an error
 * message when it fails.
 */
export async function saveProduct(
  id: number | null,
  values: ProductFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid") };
  }

  let savedId: number;
  try {
    const res = await backendFetch(
      id ? `/products/${encodeURIComponent(id)}` : "/products",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as ProductDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`${path}/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes a product (logically: the backend sets deletedAt). The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteProduct(id: number): Promise<ActionError | null> {
  try {
    await backendFetch(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

/** A product as a picker shows it: enough to name it. */
export type ProductOption = Pick<ListedProduct, "id" | "name">;

/**
 * The products whose name contains `name` (all when blank), sorted by
 * name: the first `limit`, for a picker that searches as the user types
 * (ProductSelect). Server actions, since backendFetch only runs on the
 * server.
 */
export async function searchProducts({
  name,
  limit = 20,
}: {
  name: string;
  limit?: number;
}): Promise<ProductOption[]> {
  const query = name.trim();
  const list = await listProducts({
    // The backend allows up to 100.
    limit: Math.min(Math.max(limit, 1), 100),
    offset: 0,
    filters: query ? { name: query } : {},
  });
  return list.products.map(({ id, name }) => ({ id, name }));
}

/**
 * The product with this `id`, for a picker that already has a value
 * (e.g. editing an order); null when it doesn't exist or was deleted.
 */
export async function getProductOption(
  id: string,
): Promise<ProductOption | null> {
  try {
    const { name } = await getProduct(id);
    return { id: Number(id), name };
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import {
  salesOrderTypeSchema,
  type SalesOrderTypeFormValues,
} from "./schema.ts";
import type { ListedSalesOrderType, SalesOrderTypeDetail } from "./types.ts";
import { getSalesOrderType, listSalesOrderTypes } from "./server.ts";

/*
 * Sales order type mutations shared by the apps. The backend checks the session
 * (forwarded by backendFetch) on every call, since these can be invoked by
 * any POST.
 */

export interface ActionError {
  error: string;
  /** The backend's HTTP status, when it answered with an error. */
  status?: number;
  /** The contract key of the backend's message (see setServerError). */
  messageKey?: string;
}

/** The error to show; the backend's own message is already translated. */
async function actionError(error: unknown): Promise<ActionError> {
  if (!(error instanceof BackendError)) {
    throw error;
  }
  const t = await getTranslations();
  if (error.status === 401) {
    return { error: t("common.errors.sessionExpired"), status: error.status };
  }
  if (error.status === 404) {
    return { error: t("salesOrderTypes.notFound"), status: error.status };
  }
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

/**
 * Creates a sales order type (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's sales order types list). Returns an
 * error message when it fails.
 */
export async function saveSalesOrderType(
  id: SalesOrderTypeDetail["id"] | null,
  values: SalesOrderTypeFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = salesOrderTypeSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }

  let savedId: SalesOrderTypeDetail["id"];
  try {
    const res = await backendFetch(
      id
        ? `/sales-order-types/${encodeURIComponent(id)}`
        : "/sales-order-types",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as SalesOrderTypeDetail).id;
  } catch (error) {
    return await actionError(error);
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the sales order type as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes a sales order type (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteSalesOrderType(
  id: SalesOrderTypeDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/sales-order-types/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return await actionError(error);
  }
}

/** A sales order type as a picker shows it: enough to name it. */
export type SalesOrderTypeOption = Pick<ListedSalesOrderType, "id" | "description">;

/**
 * The sales order type with this `id`, for a picker that already has a value
 * (e.g. editing an order); null when it doesn't exist or was deleted.
 */
export async function getSalesOrderTypeOption(
  id: string,
): Promise<SalesOrderTypeOption | null> {
  try {
    const { description } = await getSalesOrderType(id);
    return { id, description };
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * The active sales order types whose id or description contains `search`
 * (all when blank): the first `limit`, for a picker that searches as the
 * user types (SalesOrderTypeSelect). Server actions, since backendFetch only
 * runs on the server.
 */
export async function searchSalesOrderTypes({
  search = "",
  limit = 20,
}: {
  search?: string;
  limit?: number;
} = {}): Promise<SalesOrderTypeOption[]> {
  const list = await listSalesOrderTypes({
    // The backend allows up to 100.
    limit: Math.min(Math.max(limit, 1), 100),
    offset: 0,
    filters: { active: "true" },
    search: search.trim() || undefined,
  });
  return list.items.map(({ id, description }) => ({ id, description }));
}

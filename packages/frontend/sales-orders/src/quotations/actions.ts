"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { quotationSchema, type QuotationFormValues } from "./schema.ts";
import type { QuotationDetail } from "./types.ts";
import { listQuotationChanges } from "./server.ts";
import type { ChangesPage } from "@dafne/frontend-changelog";
import { QUOTATION_STATUSES, type QuotationStatus } from "@dafne/contracts";

/*
 * Quotation mutations shared by the apps. The backend checks the session
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
    return { error: t("quotations.notFound"), status: error.status };
  }
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

/**
 * Creates a quotation (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's quotations list). `reprice`
 * (replacing only) prices every item anew from its product's price, instead
 * of keeping the price of unchanged items. Returns an error message when it
 * fails.
 */
export async function saveQuotation(
  id: QuotationDetail["id"] | null,
  values: QuotationFormValues,
  path: string,
  options?: { reprice?: boolean },
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = quotationSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }

  let savedId: QuotationDetail["id"];
  try {
    const res = await backendFetch(
      id
        ? // Any POST can call this: only a real true reprices.
          `/quotations/${encodeURIComponent(id)}${options?.reprice === true ? "?reprice=true" : ""}`
        : "/quotations",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as QuotationDetail).id;
  } catch (error) {
    return await actionError(error);
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the quotation as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Moves a quotation to `status` (POST /quotations/:id/status). Accepting it
 * creates its sales order: the answer has it (`salesOrder`). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function changeQuotationStatus(
  id: QuotationDetail["id"],
  status: QuotationStatus,
): Promise<QuotationDetail | ActionError> {
  // Any POST can call this: only a known status (the backend checks it too).
  if (!(QUOTATION_STATUSES as readonly string[]).includes(status)) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }
  try {
    const res = await backendFetch(`/quotations/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
    return (await res.json()) as QuotationDetail;
  } catch (error) {
    return await actionError(error);
  }
}

/**
 * Deletes a quotation (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteQuotation(
  id: QuotationDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/quotations/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return await actionError(error);
  }
}

/**
 * A page of the quotation's change log, for its history sheet (a client
 * component: backendFetch only runs on the server).
 */
export async function getQuotationChanges(
  id: QuotationDetail["id"],
  query: { limit: number; offset: number },
): Promise<ChangesPage | ActionError> {
  try {
    return await listQuotationChanges(id, query);
  } catch (error) {
    return await actionError(error);
  }
}

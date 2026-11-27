"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { uomConversionSchema, type UomConversionFormValues } from "./schema.ts";
import type { ConvertibleUom, UomConversionDetail } from "./types.ts";
import { listUomConversions } from "./server.ts";

/*
 * Uom conversion mutations shared by the apps. The backend checks the session
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
    return { error: t("uomConversions.notFound"), status: error.status };
  }
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

/**
 * Creates an uom conversion (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's uom conversions list). Returns an
 * error message when it fails.
 */
export async function saveUomConversion(
  id: UomConversionDetail["id"] | null,
  values: UomConversionFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = uomConversionSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }

  let savedId: UomConversionDetail["id"];
  try {
    const res = await backendFetch(
      id ? `/uom-conversions/${encodeURIComponent(id)}` : "/uom-conversions",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as UomConversionDetail).id;
  } catch (error) {
    return await actionError(error);
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the uom conversion as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes an uom conversion (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteUomConversion(
  id: UomConversionDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/uom-conversions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return await actionError(error);
  }
}

/**
 * The units `baseId` converts to directly (either way), each with how many
 * of `baseId` one of it is, by symbol: the units a product with this base
 * unit can also be sold in.
 */
export async function getConvertibleUoms(
  baseId: string,
): Promise<ConvertibleUom[]> {
  if (!baseId) {
    return [];
  }
  const { items } = await listUomConversions({
    // The backend allows up to 100; a unit has far fewer.
    limit: 100,
    offset: 0,
    filters: { uomId: baseId },
  });
  return items
    .map((conversion) =>
      conversion.fromUomId === baseId
        ? { uomId: conversion.toUomId, name: conversion.to.name, factor: conversion.factor }
        : {
            uomId: conversion.fromUomId,
            name: conversion.from.name,
            factor: Number((1 / conversion.factor).toPrecision(15)),
          },
    )
    .sort((a, b) => a.uomId.localeCompare(b.uomId));
}

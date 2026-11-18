"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import type { AssistantProviderCheck } from "@dafne/contracts";
import {
  assistantProviderSchema,
  type AssistantProviderFormValues,
} from "./schema.ts";
import type { AssistantProviderDetail } from "./types.ts";

/*
 * Assistant provider mutations shared by the apps. The backend checks the session
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
    return t("assistantProviders.notFound");
  }
  return error.message || t("common.errors.generic");
}

/**
 * Creates an assistant provider (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's assistant providers list). Returns an
 * error message when it fails.
 */
export async function saveAssistantProvider(
  id: AssistantProviderDetail["id"] | null,
  values: AssistantProviderFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = assistantProviderSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid") };
  }

  let savedId: AssistantProviderDetail["id"];
  try {
    const res = await backendFetch(
      id
        ? `/assistant-providers/${encodeURIComponent(id)}`
        : "/assistant-providers",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as AssistantProviderDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the assistant provider as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes an assistant provider (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteAssistantProvider(
  id: AssistantProviderDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/assistant-providers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

/**
 * Tries a provider (its URL and the key it names) and lists its models:
 * the backend's POST /assistant-providers/:id/check (super-admins only).
 */
export async function checkAssistantProvider(
  id: AssistantProviderDetail["id"],
): Promise<AssistantProviderCheck | ActionError> {
  try {
    const res = await backendFetch(`/assistant-providers/${encodeURIComponent(id)}/check`, {
      method: "POST",
    });
    return (await res.json()) as AssistantProviderCheck;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

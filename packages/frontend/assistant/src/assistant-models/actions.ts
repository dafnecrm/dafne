"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import {
  assistantModelSchema,
  type AssistantModelFormValues,
} from "./schema.ts";
import type { AssistantModelDetail } from "./types.ts";

/*
 * Assistant model mutations shared by the apps. The backend checks the session
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
    return { error: t("assistantModels.notFound"), status: error.status };
  }
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

/**
 * Creates an assistant model (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's assistant models list). Returns an
 * error message when it fails.
 */
export async function saveAssistantModel(
  id: AssistantModelDetail["id"] | null,
  values: AssistantModelFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = assistantModelSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }

  let savedId: AssistantModelDetail["id"];
  try {
    const res = await backendFetch(
      id ? `/assistant-models/${encodeURIComponent(id)}` : "/assistant-models",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as AssistantModelDetail).id;
  } catch (error) {
    return await actionError(error);
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the assistant model as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes an assistant model (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteAssistantModel(
  id: AssistantModelDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/assistant-models/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return await actionError(error);
  }
}

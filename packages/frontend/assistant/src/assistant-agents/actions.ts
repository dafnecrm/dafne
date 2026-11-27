"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import {
  assistantAgentSchema,
  type AssistantAgentFormValues,
} from "./schema.ts";
import type { AssistantAgentDetail } from "./types.ts";

/*
 * Assistant agent mutations shared by the apps. The backend checks the session
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
    return { error: t("assistantAgents.notFound"), status: error.status };
  }
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

/**
 * Creates an assistant agent (no `id`) or replaces one, then opens its page
 * (`<path>/<id>`, `path` being the app's assistant agents list). Returns an
 * error message when it fails.
 */
export async function saveAssistantAgent(
  id: AssistantAgentDetail["id"] | null,
  values: AssistantAgentFormValues,
  path: string,
): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = assistantAgentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }

  let savedId: AssistantAgentDetail["id"];
  try {
    const res = await backendFetch(
      id ? `/assistant-agents/${encodeURIComponent(id)}` : "/assistant-agents",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as AssistantAgentDetail).id;
  } catch (error) {
    return await actionError(error);
  }
  const href = `${path}/${encodeURIComponent(savedId)}`;
  // The browser keeps visited pages (the edit page among them) in its
  // cache: drop them, or editing again would show the assistant agent as it was.
  revalidatePath(href, "layout");
  // Outside the try: redirect works by throwing.
  redirect(href);
}

/**
 * Deletes an assistant agent (logically: the backend sets deletedAt). The caller
 * refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteAssistantAgent(
  id: AssistantAgentDetail["id"],
): Promise<ActionError | null> {
  try {
    await backendFetch(`/assistant-agents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return await actionError(error);
  }
}

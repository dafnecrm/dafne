"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BackendError, authFetch } from "@dafne/frontend-api/server";
import type { ChangesPage } from "@dafne/frontend-changelog";
import { userSchema, type UserFormValues } from "./schema.ts";
import { listUserChanges } from "./server.ts";
import type { UserDetail } from "./types.ts";

/*
 * User mutations. The backend checks the session (forwarded by
 * authFetch) and the admin role on every call, since these can be
 * invoked by any POST.
 */

export interface ActionError {
  error: string;
  /** The backend's HTTP status, when it answered with an error. */
  status?: number;
  /** The contract key of the backend's message (see setServerError). */
  messageKey?: string;
}

async function actionError(error: unknown): Promise<ActionError> {
  if (!(error instanceof BackendError)) {
    throw error;
  }
  const t = await getTranslations();
  if (error.status === 401) {
    return { error: t("common.errors.sessionExpired"), status: error.status };
  }
  if (error.status === 403) {
    return { error: t("users.adminsOnly"), status: error.status };
  }
  // 409 (email taken) and 400 carry a message meant for the user, translated by the backend.
  return {
    error: error.message || t("common.errors.generic"),
    status: error.status,
    messageKey: error.body.messageKey,
  };
}

/**
 * Creates a user with the password the admin picked (the backend emails
 * them a verification link), then opens their page (`<path>/<id>`, `path`
 * being the app's users list). Returns an error message when it fails.
 */
export async function createUser(values: UserFormValues, path: string): Promise<ActionError> {
  // Any POST can call this: only redirect within the app.
  if (!/^\/[\w/-]*$/.test(path)) {
    throw new Error(`Invalid path: ${path}`);
  }
  const parsed = userSchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid"), status: 400 };
  }

  let id: string;
  try {
    const res = await authFetch("/users", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    id = ((await res.json()) as UserDetail).id;
  } catch (error) {
    return await actionError(error);
  }
  // Outside the try: redirect works by throwing.
  redirect(`${path}/${encodeURIComponent(id)}`);
}

/**
 * A page of the user's change log, for its history sheet (a client
 * component: authFetch only runs on the server).
 */
export async function getUserChanges(
  id: string,
  query: { limit: number; offset: number },
): Promise<ChangesPage | ActionError> {
  try {
    return await listUserChanges(id, query);
  } catch (error) {
    return await actionError(error);
  }
}

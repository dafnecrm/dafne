"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@dafne/frontend-api/server";
import { activitySchema, type ActivityFormValues } from "./schema";
import { ActivityDetail } from "./types";
import { listActivityChanges } from "./server.ts";
import type { ChangesPage } from "@dafne/frontend-changelog";
import type { ActivityStatus, ActivityStatusBody } from "@dafne/contracts";

/*
 * Activity mutations. The backend checks the session (forwarded by
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
    return t("activities.notFound");
  }
  return error.message || t("common.errors.generic");
}

/**
 * Creates a activity (no `id`) or replaces one, then opens its page.
 * Returns an error message when it fails.
 */
export async function saveActivity(
  id: number | null,
  values: ActivityFormValues,
): Promise<ActionError> {
  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) {
    return { error: (await getTranslations())("common.errors.invalid") };
  }

  let savedId: number;
  try {
    const res = await backendFetch(
      id ? `/activities/${encodeURIComponent(id)}` : "/activities",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as ActivityDetail).id;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/activities/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes a activity (logically: the backend sets deletedAt). The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteActivity(id: number): Promise<ActionError | null> {
  try {
    await backendFetch(`/activities/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

/**
 * Moves an activity to `status` (POST /activities/:id/status, through its
 * state machine). The caller refreshes or leaves the page. Returns an
 * error message when it fails.
 */
async function changeActivityStatus(
  id: number,
  status: ActivityStatus,
): Promise<ActionError | null> {
  try {
    await backendFetch(`/activities/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ status } satisfies ActivityStatusBody),
    });
    return null;
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

/** Closes an open activity (see changeActivityStatus). */
export async function closeActivity(id: number): Promise<ActionError | null> {
  return changeActivityStatus(id, "closed");
}

/** Reopens a closed activity (see changeActivityStatus). */
export async function reopenActivity(id: number): Promise<ActionError | null> {
  return changeActivityStatus(id, "open");
}

/**
 * A page of the activity's change log, for its history sheet (a client
 * component: backendFetch only runs on the server).
 */
export async function getActivityChanges(
  id: ActivityDetail["id"],
  query: { limit: number; offset: number },
): Promise<ChangesPage | ActionError> {
  try {
    return await listActivityChanges(id, query);
  } catch (error) {
    return { error: await errorMessage(error) };
  }
}

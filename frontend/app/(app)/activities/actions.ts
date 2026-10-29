"use server";

import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@/lib/backend";
import type { ActivityDetail } from "@/lib/activities";
import { activitySchema, type ActivityFormValues } from "./schema";

/*
 * Activity mutations. The backend checks the session (forwarded by
 * backendFetch) on every call, since these can be invoked by any POST.
 */

export interface ActionError {
  error: string;
}

function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) throw error;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 404) return "This activity no longer exists.";
  return error.message || "Something went wrong. Please try again.";
}

/**
 * Creates a activity (no `id`) or replaces one, then opens its page.
 * Returns an error message when it fails.
 */
export async function saveActivity(
  id: string | null,
  values: ActivityFormValues,
): Promise<ActionError> {
  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) return { error: "Some fields are not valid." };

  let savedId: string;
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
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/activities/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes a activity (logically: the backend sets deletedAt). The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteActivity(id: string): Promise<ActionError | null> {
  try {
    await backendFetch(`/activities/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

/**
 * Closes an activity. The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function closeActivity(id: string): Promise<ActionError | null> {
  try {
    await backendFetch(`/activities/${encodeURIComponent(id)}/close`, {
      method: "POST",
    });
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

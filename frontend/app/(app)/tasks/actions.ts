"use server";

import { redirect } from "next/navigation";
import { BackendError, backendFetch } from "@/lib/backend";
import type { TaskDetail } from "@/lib/tasks";
import { taskSchema, type TaskFormValues } from "./schema";

/*
 * Task mutations. The backend checks the session (forwarded by
 * backendFetch) on every call, since these can be invoked by any POST.
 */

export interface ActionError {
  error: string;
}

function errorMessage(error: unknown) {
  if (!(error instanceof BackendError)) throw error;
  if (error.status === 401) return "Your session has expired. Sign in again.";
  if (error.status === 404) return "This task no longer exists.";
  return error.message || "Something went wrong. Please try again.";
}

/**
 * Creates a task (no `id`) or replaces one, then opens its page.
 * Returns an error message when it fails.
 */
export async function saveTask(
  id: string | null,
  values: TaskFormValues,
): Promise<ActionError> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) return { error: "Some fields are not valid." };

  let savedId: string;
  try {
    const res = await backendFetch(
      id ? `/tasks/${encodeURIComponent(id)}` : "/tasks",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(parsed.data),
      },
    );
    savedId = ((await res.json()) as TaskDetail).id;
  } catch (error) {
    return { error: errorMessage(error) };
  }
  // Outside the try: redirect works by throwing.
  redirect(`/tasks/${encodeURIComponent(savedId)}`);
}

/**
 * Deletes a task (logically: the backend sets deletedAt). The
 * caller refreshes or leaves the page. Returns an error message when it fails.
 */
export async function deleteTask(id: string): Promise<ActionError | null> {
  try {
    await backendFetch(`/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return null;
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

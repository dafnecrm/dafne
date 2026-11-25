"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { BackendError, tasksFetch } from "@dafne/frontend-api/server";
import { updateTaskBodySchema } from "@dafne/contracts";
import type { TaskRunDetail, TaskSettingsValues } from "./types.ts";

/*
 * Mutations of the scheduled tasks (apps/sales-tasks). The API checks the
 * session (forwarded) and the admin role on every call, since these can be
 * invoked by any POST.
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
  return error.message || t("common.errors.generic");
}

const taskPath = (key: string) => `/tasks/${encodeURIComponent(key)}`;

/** Replaces a task's settings; returns an error message when it fails. */
export async function updateTask(key: string, values: TaskSettingsValues): Promise<ActionError | null> {
  const parsed = updateTaskBodySchema.safeParse(values);
  if (!parsed.success) {
    const t = await getTranslations();
    const key = parsed.error.issues[0]?.message;
    return { error: key && t.has(`contracts.${key}` as never) ? t(`contracts.${key}` as never) : t("common.errors.invalid") };
  }
  try {
    await tasksFetch(taskPath(key), { method: "PUT", body: JSON.stringify(parsed.data) });
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  revalidatePath("/admin/tasks", "layout");
  return null;
}

/** Puts a task back on the settings its code gives it. */
export async function resetTask(key: string): Promise<ActionError | null> {
  try {
    await tasksFetch(`${taskPath(key)}/reset`, { method: "POST" });
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  revalidatePath("/admin/tasks", "layout");
  return null;
}

/**
 * Starts a run of the task now. An error when it has one queued or
 * running already (the API records the attempt as skipped).
 */
export async function runTask(key: string): Promise<ActionError | { runId: number }> {
  let run: TaskRunDetail;
  try {
    run = await (await tasksFetch(`${taskPath(key)}/run`, { method: "POST" })).json();
  } catch (error) {
    return { error: await errorMessage(error) };
  }
  revalidatePath("/admin/tasks", "layout");
  return { runId: run.id };
}

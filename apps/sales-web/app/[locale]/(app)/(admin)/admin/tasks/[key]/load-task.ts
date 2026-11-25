import { notFound } from "next/navigation";
import { BackendError } from "@dafne/frontend-api";
import { getTask, getTaskRun } from "@dafne/frontend-tasks/server";

/** Rethrows `error`, or shows the 404 page for a 404. */
function notFoundOn404(error: unknown): never {
  if (error instanceof BackendError && error.status === 404) {
    notFound();
  }
  throw error;
}

/** The task for a page, or the 404 page if the app doesn't define it. */
export async function loadTask(key: string) {
  try {
    return await getTask(key);
  } catch (error) {
    notFoundOn404(error);
  }
}

/** The run for a page, or the 404 page if there's none (or it's another task's). */
export async function loadTaskRun(key: string, id: string) {
  let run;
  try {
    run = await getTaskRun(id);
  } catch (error) {
    notFoundOn404(error);
  }
  if (run.taskKey !== key) {
    notFound();
  }
  return run;
}

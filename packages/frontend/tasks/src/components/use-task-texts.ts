import { useTranslations } from "next-intl";

/**
 * A task's name and description from the `tasks.names` messages (the key
 * `quotations.expire` reads tasks.names.quotations.expire.name), else its key.
 */
export function useTaskTexts() {
  const t = useTranslations();
  return (key: string) => {
    const name = `tasks.names.${key}.name`;
    const description = `tasks.names.${key}.description`;
    return {
      name: t.has(name as never) ? t(name as never) : key,
      description: t.has(description as never) ? t(description as never) : null,
    };
  };
}

/** A run's error: the contracts' text when it's one of their keys (tasks.run.timedOut), else as it is. */
export function useRunError() {
  const t = useTranslations();
  return (error: string) => {
    const key = `contracts.${error}`;
    return /^[\w.]+$/.test(error) && t.has(key as never) ? t(key as never) : error;
  };
}

/** A duration in ms, short: 850 ms, 12.4 s, 3 min 5 s, 2 h 4 min. */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)} s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ${Math.round(seconds % 60)} s`;
  }
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** How long a run took (or has been running), or null before it started. */
export function runDuration(run: { startedAt: string | null; finishedAt: string | null }, now = Date.now()) {
  if (!run.startedAt) {
    return null;
  }
  const end = run.finishedAt ? new Date(run.finishedAt).getTime() : now;
  return formatDuration(Math.max(0, end - new Date(run.startedAt).getTime()));
}

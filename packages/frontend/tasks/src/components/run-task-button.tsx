"use client";

import { PlayIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@dafne/frontend-ui/components/button";
import { runTask } from "../actions.ts";

/**
 * Starts a run of the task now, then opens it (`<path>/runs/<id>`). When
 * the task is already running, says so instead.
 */
export function RunTaskButton({ taskKey, path }: { taskKey: string; path: string }) {
  const t = useTranslations("tasks");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await runTask(taskKey);
            if ("error" in result) {
              setError(result.error);
              router.refresh();
            } else {
              setError(null);
              router.push(`${path}/runs/${result.runId}`);
            }
          })
        }
      >
        <PlayIcon data-icon="inline-start" />
        {t("runNow")}
      </Button>
    </div>
  );
}

"use client";

import { CircleAlertIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@dafne/frontend-ui/components/alert";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@dafne/frontend-ui/components/field";
import { Input } from "@dafne/frontend-ui/components/input";
import { Switch } from "@dafne/frontend-ui/components/switch";
import { resetTask, updateTask } from "../actions.ts";
import type { TaskDetail, TaskSettingsValues } from "../types.ts";

/** A task's settings (schedule, time zone, on/off, timeout), saved with PUT /tasks/:key. */
export function TaskSettingsForm({ task }: { task: TaskDetail }) {
  const t = useTranslations("tasks");
  const initial: TaskSettingsValues = {
    cron: task.cron ?? "",
    timezone: task.timezone,
    enabled: task.enabled,
    timeoutSeconds: task.timeoutSeconds === null ? "" : String(task.timeoutSeconds),
  };
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof TaskSettingsValues>(field: K, value: TaskSettingsValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));

  const save = () =>
    startTransition(async () => {
      const result = await updateTask(task.key, values);
      setMessage(result ? { error: true, text: result.error } : { error: false, text: t("saved") });
    });
  const reset = () =>
    startTransition(async () => {
      const result = await resetTask(task.key);
      if (result) {
        setMessage({ error: true, text: result.error });
      } else {
        // The page reloads with the defaults: start from them.
        window.location.reload();
      }
    });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-4"
    >
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="task-cron">{t("fields.cron")}</FieldLabel>
          <Input
            id="task-cron"
            className="font-mono"
            placeholder="0 3 * * *"
            value={values.cron}
            onChange={(event) => set("cron", event.target.value)}
          />
          <FieldDescription>{t("hints.cron")}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="task-timezone">{t("fields.timezone")}</FieldLabel>
          <Input
            id="task-timezone"
            placeholder="Europe/Rome"
            value={values.timezone}
            onChange={(event) => set("timezone", event.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="task-timeout">{t("fields.timeoutSeconds")}</FieldLabel>
          <Input
            id="task-timeout"
            inputMode="numeric"
            value={values.timeoutSeconds}
            onChange={(event) => set("timeoutSeconds", event.target.value)}
          />
          <FieldDescription>{t("hints.timeoutSeconds")}</FieldDescription>
        </Field>
        <Field orientation="horizontal">
          <Switch
            id="task-enabled"
            checked={values.enabled}
            onCheckedChange={(checked) => set("enabled", checked)}
          />
          <FieldContent>
            <FieldLabel htmlFor="task-enabled">{t("fields.enabled")}</FieldLabel>
            <FieldDescription>{t("hints.enabled")}</FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
      {message && (
        <Alert variant={message.error ? "destructive" : "default"} role="status">
          {message.error && <CircleAlertIcon />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <SaveIcon data-icon="inline-start" />
          {t("save")}
        </Button>
        {task.customized && (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={reset}>
            <RotateCcwIcon data-icon="inline-start" />
            {t("reset")}
          </Button>
        )}
        {task.customized && <span className="text-xs text-muted-foreground">{t("hints.customized")}</span>}
      </div>
    </form>
  );
}

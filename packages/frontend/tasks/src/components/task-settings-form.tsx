"use client";

import { CircleAlertIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@dafne/frontend-ui/components/alert";
import { Button } from "@dafne/frontend-ui/components/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@dafne/frontend-ui/components/field";
import { Input } from "@dafne/frontend-ui/components/input";
import { Switch } from "@dafne/frontend-ui/components/switch";
import { resetTask, updateTask, type ActionError } from "../actions.ts";
import type { TaskDetail, TaskSettingsValues } from "../types.ts";

type Message =
  | { error: false; text: string }
  | {
      error: true;
      text: string;
      /** 4xx: the API turned it down, for a reason the user can fix. */
      rejected: boolean;
      /** The field the error is about (from its message key), if any. */
      field?: keyof TaskSettingsValues;
    };

const FIELDS: (keyof TaskSettingsValues)[] = ["cron", "timezone", "enabled", "timeoutSeconds"];

/** An action's error as the form shows it. */
function errorMessage(result: ActionError): Message {
  const field = result.messageKey
    ?.split(".")
    .slice(1)
    .find((segment): segment is keyof TaskSettingsValues =>
      FIELDS.includes(segment as keyof TaskSettingsValues),
    );
  const rejected = result.status !== undefined && result.status >= 400 && result.status < 500;
  return { error: true, text: result.error, rejected, field };
}

/** A task's settings (schedule, time zone, on/off, timeout), saved with PUT /tasks/:key. */
export function TaskSettingsForm({ task }: { task: TaskDetail }) {
  const t = useTranslations("tasks");
  const tForm = useTranslations("form");
  const initial: TaskSettingsValues = {
    cron: task.cron ?? "",
    timezone: task.timezone,
    enabled: task.enabled,
    timeoutSeconds: task.timeoutSeconds === null ? "" : String(task.timeoutSeconds),
  };
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof TaskSettingsValues>(field: K, value: TaskSettingsValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    // The field the error was about changed: it no longer applies to it.
    setMessage((current) => (current?.error && current.field === field ? { ...current, field: undefined } : current));
  };
  const fieldError = (field: keyof TaskSettingsValues) =>
    message?.error && message.field === field ? message.text : undefined;

  const save = () =>
    startTransition(async () => {
      const result = await updateTask(task.key, values);
      setMessage(result ? errorMessage(result) : { error: false, text: t("saved") });
    });
  const reset = () =>
    startTransition(async () => {
      const result = await resetTask(task.key);
      if (result) {
        setMessage(errorMessage(result));
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
        <Field data-invalid={fieldError("cron") !== undefined}>
          <FieldLabel htmlFor="task-cron">{t("fields.cron")}</FieldLabel>
          <Input
            id="task-cron"
            aria-invalid={fieldError("cron") !== undefined}
            className="font-mono"
            placeholder="0 3 * * *"
            value={values.cron}
            onChange={(event) => set("cron", event.target.value)}
          />
          <FieldDescription>{t("hints.cron")}</FieldDescription>
          <FieldError>{fieldError("cron")}</FieldError>
        </Field>
        <Field data-invalid={fieldError("timezone") !== undefined}>
          <FieldLabel htmlFor="task-timezone">{t("fields.timezone")}</FieldLabel>
          <Input
            id="task-timezone"
            aria-invalid={fieldError("timezone") !== undefined}
            placeholder="Europe/Rome"
            value={values.timezone}
            onChange={(event) => set("timezone", event.target.value)}
          />
          <FieldError>{fieldError("timezone")}</FieldError>
        </Field>
        <Field data-invalid={fieldError("timeoutSeconds") !== undefined}>
          <FieldLabel htmlFor="task-timeout">{t("fields.timeoutSeconds")}</FieldLabel>
          <Input
            id="task-timeout"
            aria-invalid={fieldError("timeoutSeconds") !== undefined}
            inputMode="numeric"
            value={values.timeoutSeconds}
            onChange={(event) => set("timeoutSeconds", event.target.value)}
          />
          <FieldDescription>{t("hints.timeoutSeconds")}</FieldDescription>
          <FieldError>{fieldError("timeoutSeconds")}</FieldError>
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
          {message.error && (
            <AlertTitle>{message.rejected ? tForm("serverRejected") : tForm("serverError")}</AlertTitle>
          )}
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

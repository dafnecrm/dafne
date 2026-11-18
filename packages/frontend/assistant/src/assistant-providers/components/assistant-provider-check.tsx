"use client";

import { PlugZapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { AssistantProviderCheck } from "@dafne/contracts";
import { Alert, AlertDescription, AlertTitle } from "@dafne/frontend-ui/components/alert";
import { Badge } from "@dafne/frontend-ui/components/badge";
import { Button } from "@dafne/frontend-ui/components/button";
import { Spinner } from "@dafne/frontend-ui/components/spinner";
import { checkAssistantProvider } from "../actions.ts";
import type { AssistantProviderDetail } from "../types.ts";

/**
 * "Test connection": asks the backend to reach the provider with its key,
 * then shows the model ids it offers (to copy into a model).
 */
export function AssistantProviderCheckButton({
  assistantProvider,
}: {
  assistantProvider: Pick<AssistantProviderDetail, "id">;
}) {
  const t = useTranslations("assistantProviders.check");
  const [result, setResult] = useState<AssistantProviderCheck | { error: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-4">
      <div>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => setResult(await checkAssistantProvider(assistantProvider.id)))
          }
        >
          {pending ? <Spinner data-icon="inline-start" /> : <PlugZapIcon data-icon="inline-start" />}
          {t("button")}
        </Button>
      </div>
      {result && "ok" in result && result.ok ? (
        <Alert>
          <AlertTitle>{t("ok", { count: result.models.length })}</AlertTitle>
          {result.models.length > 0 && (
            <AlertDescription>
              <p className="mb-2">{t("models")}</p>
              <div className="flex flex-wrap gap-1">
                {result.models.map((model) => (
                  <Badge key={model} variant="secondary" className="font-mono">
                    {model}
                  </Badge>
                ))}
              </div>
            </AlertDescription>
          )}
        </Alert>
      ) : result ? (
        <Alert variant="destructive">
          <AlertTitle>{t("failed", { error: result.error ?? "" })}</AlertTitle>
        </Alert>
      ) : null}
    </div>
  );
}

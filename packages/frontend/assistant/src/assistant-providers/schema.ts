import { formOptions } from "@tanstack/react-form-nextjs";
import {
  assistantProviderBodySchema,
  type AssistantProviderKind,
  type AssistantProviderBody,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { AssistantProviderDetail } from "./types.ts";
import { type AssistantProvidersMessageKey } from "./messages/index.ts";

/** Form values: every field is text, "" when blank. Keys follow the contract. */
export type AssistantProviderFormValues = Record<
  Exclude<keyof AssistantProviderBody, "kind" | "enabled">,
  string
> & {
  kind: AssistantProviderKind;
  enabled: boolean;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const assistantProviderSchema =
  formSchema<AssistantProviderFormValues>()(assistantProviderBodySchema);

export const KIND_OPTIONS = [
  { value: "anthropic", label: "assistantProviders.kind.anthropic" },
  { value: "openai", label: "assistantProviders.kind.openai" },
  {
    value: "openai-compatible",
    label: "assistantProviders.kind.openai-compatible",
  },
] satisfies {
  value: AssistantProviderKind;
  label: AssistantProvidersMessageKey;
}[];

/** Form values for a new assistant provider, or for editing `assistantProvider`. */
export function assistantProviderFormOpts(
  assistantProvider?: AssistantProviderDetail,
) {
  return formOptions({
    defaultValues: {
      name: assistantProvider?.name ?? "",
      kind: assistantProvider?.kind ?? "anthropic",
      baseUrl: assistantProvider?.baseUrl ?? "",
      apiKeyEnv: assistantProvider?.apiKeyEnv ?? "",
      enabled: assistantProvider?.enabled ?? false,
    } satisfies AssistantProviderFormValues as AssistantProviderFormValues,
  });
}

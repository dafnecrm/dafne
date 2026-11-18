import { formOptions } from "@tanstack/react-form-nextjs";
import {
  ASSISTANT_READ_TOOLS,
  ASSISTANT_WRITE_TOOLS,
  assistantAgentBodySchema,
  type AssistantAgentAudience,
  type AssistantAgentBody,
  type AssistantToolName,
} from "@dafne/contracts";
import { formSchema } from "@dafne/frontend-forms";
import type { AssistantAgentDetail } from "./types.ts";

/** Form values: text fields as strings ("" when blank), the tools as a list. */
export type AssistantAgentFormValues = Record<
  Exclude<
    keyof AssistantAgentBody,
    "allowModelOverride" | "enabled" | "tools" | "audience" | "groupIds"
  >,
  string
> & {
  tools: AssistantToolName[];
  audience: AssistantAgentAudience;
  groupIds: number[];
  allowModelOverride: boolean;
  enabled: boolean;
};

/**
 * The form validates with the backend's own schema (same rules and
 * messages), which turns "" in optional fields into null.
 */
export const assistantAgentSchema = formSchema<AssistantAgentFormValues>()(
  assistantAgentBodySchema,
);

/** The tools, in the form's two groups. */
export const TOOL_GROUPS = [
  { group: "read", tools: ASSISTANT_READ_TOOLS },
  { group: "write", tools: ASSISTANT_WRITE_TOOLS },
] as const;

/** Form values for a new agent (every read tool), or for editing `assistantAgent`. */
export function assistantAgentFormOpts(assistantAgent?: AssistantAgentDetail) {
  return formOptions({
    defaultValues: {
      name: assistantAgent?.name ?? "",
      description: assistantAgent?.description ?? "",
      systemPrompt: assistantAgent?.systemPrompt ?? "",
      tools: assistantAgent?.tools ?? [...ASSISTANT_READ_TOOLS],
      defaultModelId: assistantAgent?.defaultModelId?.toString() ?? "",
      allowModelOverride: assistantAgent?.allowModelOverride ?? true,
      enabled: assistantAgent?.enabled ?? false,
      audience: assistantAgent?.audience ?? "everyone",
      groupIds: assistantAgent?.groups.map((group) => group.id) ?? [],
    } satisfies AssistantAgentFormValues as AssistantAgentFormValues,
  });
}

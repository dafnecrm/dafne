import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import {
  ASSISTANT_REASONING_LEVELS,
  assistantModelBodySchema,
  type AssistantReasoningLevel,
} from "@dafne/contracts";
import type { AssistantModelDetail } from "./types.ts";
import type { AssistantModelsMessageKey } from "./messages/index.ts";

/**
 * Form values: text fields as strings ("" when blank), the options as
 * fields of their own (reasoning "" is the model's default).
 */
export interface AssistantModelFormValues {
  providerId: string;
  modelId: string;
  label: string;
  supportsTools: boolean;
  enabled: boolean;
  reasoning: AssistantReasoningLevel | "";
  temperature: string;
}

/** The values as the contract's body: the options folded into `options`. */
const toBody = ({ reasoning, temperature, ...values }: AssistantModelFormValues) => ({
  ...values,
  options:
    reasoning || temperature
      ? {
          ...(reasoning ? { reasoning } : {}),
          ...(temperature ? { temperature: Number(temperature) } : {}),
        }
      : null,
});

/**
 * Checks the values, then validates them as the backend does (its own
 * schema and messages): the output is the body to send.
 */
export const assistantModelSchema = z
  .object({
    providerId: z.string(),
    modelId: z.string(),
    label: z.string(),
    supportsTools: z.boolean(),
    enabled: z.boolean(),
    reasoning: z.enum([...ASSISTANT_REASONING_LEVELS, ""]),
    temperature: z
      .string()
      .trim()
      .regex(/^(|[0-1](\.\d+)?|2(\.0+)?)$/, { error: "contracts.common.number.invalid" }),
  })
  .transform((values, ctx) => {
    const body = assistantModelBodySchema.safeParse(toBody(values));
    if (body.success) {
      return body.data;
    }
    // Errors of the options go to their own fields.
    for (const issue of body.error.issues) {
      const path = issue.path[0] === "options" ? issue.path.slice(1) : issue.path;
      ctx.addIssue({ code: "custom", message: issue.message, path: path as PropertyKey[] });
    }
    return z.NEVER;
  }) as z.ZodType<z.output<typeof assistantModelBodySchema>, AssistantModelFormValues>;

/** The reasoning levels, for the form's select ("" first: the model's default). */
export const REASONING_OPTIONS = [
  { value: "", label: "assistantModels.reasoning.default" },
  ...ASSISTANT_REASONING_LEVELS.map((level) => ({
    value: level,
    label: `assistantModels.reasoning.${level}` as const,
  })),
] satisfies { value: string; label: AssistantModelsMessageKey }[];

/** Form values for a new model, or for editing `assistantModel`. */
export function assistantModelFormOpts(assistantModel?: AssistantModelDetail) {
  return formOptions({
    defaultValues: {
      providerId: assistantModel?.providerId?.toString() ?? "",
      modelId: assistantModel?.modelId ?? "",
      label: assistantModel?.label ?? "",
      supportsTools: assistantModel?.supportsTools ?? true,
      enabled: assistantModel?.enabled ?? false,
      reasoning: assistantModel?.options?.reasoning ?? "",
      temperature: assistantModel?.options?.temperature?.toString() ?? "",
    } satisfies AssistantModelFormValues as AssistantModelFormValues,
  });
}

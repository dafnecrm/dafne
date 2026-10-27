import type { z } from "zod";

/**
 * Types a schema for a form whose values are a subset of what the schema
 * accepts (e.g. "" where it also takes null or a missing field). TanStack
 * Form wants the schema's input to equal the form's values exactly.
 * Compiles only if every form value is valid input for the schema.
 *
 *   const schema = formSchema<CustomerFormValues>()(customerBodySchema);
 */
export function formSchema<Values>() {
  return <S extends z.ZodType>(
    schema: S & ([Values] extends [z.input<S>] ? unknown : never),
  ) => schema as unknown as z.ZodType<z.output<S>, Values>;
}

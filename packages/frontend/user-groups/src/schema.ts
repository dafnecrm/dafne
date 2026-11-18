import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import { userGroupBodySchema, type Permission } from "@dafne/contracts";
import type { UserOption } from "./actions.ts";
import type { UserGroupDetail } from "./types.ts";

/**
 * Form values: text fields as strings ("" when blank), the members as the
 * users the picker shows (with name and email for their chips).
 */
export interface UserGroupFormValues {
  name: string;
  description: string;
  members: UserOption[];
  permissions: Permission[];
}

/**
 * Validates the values as the backend does (its own schema and messages),
 * the members as their ids: the output is the body to send.
 */
export const userGroupSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    members: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
    permissions: z.array(z.string()),
  })
  .transform(({ members, ...values }, ctx) => {
    const body = userGroupBodySchema.safeParse({ ...values, memberIds: members.map((m) => m.id) });
    if (body.success) {
      return body.data;
    }
    for (const issue of body.error.issues) {
      const path = issue.path[0] === "memberIds" ? ["members"] : issue.path;
      ctx.addIssue({ code: "custom", message: issue.message, path: path as PropertyKey[] });
    }
    return z.NEVER;
  }) as z.ZodType<z.output<typeof userGroupBodySchema>, UserGroupFormValues>;

/** Form values for a new user group, or for editing `userGroup`. */
export function userGroupFormOpts(userGroup?: UserGroupDetail) {
  return formOptions({
    defaultValues: {
      name: userGroup?.name ?? "",
      description: userGroup?.description ?? "",
      members: userGroup?.members ?? [],
      permissions: userGroup?.permissions ?? [],
    } satisfies UserGroupFormValues as UserGroupFormValues,
  });
}

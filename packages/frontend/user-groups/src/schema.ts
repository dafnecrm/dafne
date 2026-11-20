import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import {
  groupPermissionsBodySchema,
  userGroupBodySchema,
  type GroupPermissionsBody,
  type Permission,
  type UserGroupBody,
} from "@dafne/contracts";
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
 * Validates the values as the backends do (their own schemas and messages),
 * the members as their ids: the output is the two bodies to send, the
 * group's (apps/auth) and its permissions (this app's API).
 */
export const userGroupSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    members: z.array(z.object({ id: z.string(), name: z.string(), email: z.string() })),
    permissions: z.array(z.string()),
  })
  .transform(({ members, permissions, ...values }, ctx) => {
    const group = userGroupBodySchema.safeParse({ ...values, memberIds: members.map((m) => m.id) });
    const granted = groupPermissionsBodySchema.safeParse({ permissions });
    if (group.success && granted.success) {
      return { group: group.data, permissions: granted.data };
    }
    for (const issue of [...(group.error?.issues ?? []), ...(granted.error?.issues ?? [])]) {
      const path = issue.path[0] === "memberIds" ? ["members"] : issue.path;
      ctx.addIssue({ code: "custom", message: issue.message, path: path as PropertyKey[] });
    }
    return z.NEVER;
  }) as z.ZodType<UserGroupBodies, UserGroupFormValues>;

/** What saving a group sends: to apps/auth, then to this app's API. */
export interface UserGroupBodies {
  group: UserGroupBody;
  permissions: GroupPermissionsBody;
}

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

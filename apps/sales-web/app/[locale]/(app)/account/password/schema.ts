import { formOptions } from "@tanstack/react-form-nextjs";
import { z } from "zod";
import { newPasswordSchema } from "@/lib/password";

// Messages are message keys, translated where they are shown.
export const changePasswordSchema = z
  .object({
    // No strength rules: the current password may predate them.
    currentPassword: z
      .string()
      .min(1, { error: "account.password.validation.current" }),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((value) => value.confirmPassword === value.newPassword, {
    error: "account.password.validation.mismatch",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const changePasswordFormOpts = formOptions({
  defaultValues: {
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    revokeOtherSessions: true,
  } as ChangePasswordValues,
});

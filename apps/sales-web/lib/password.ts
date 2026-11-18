import { z } from "zod";

/**
 * Rules for a new password (sign-up, change password). The message is a
 * message key, translated where it's shown.
 */
export const newPasswordSchema = z
  .string()
  .max(128) // backend limit
  .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/, {
    error: "auth.validation.passwordRules",
  });

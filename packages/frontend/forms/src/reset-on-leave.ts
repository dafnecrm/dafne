import type { AnyFormApi } from "@tanstack/react-form-nextjs";
import { useLayoutEffect } from "react";
import { useLeaveGuard } from "./leave-guard.tsx";

/**
 * Resets a form when its page is left, so coming back always starts fresh,
 * and asks before leaving it with unsaved changes.
 *
 * With Cache Components, Next.js keeps recently visited pages mounted but
 * hidden (React <Activity>) instead of unmounting them, so a form would
 * keep its values, errors and any password typed in. Activity runs effect
 * cleanups when it hides a page, and this one resets the form there.
 * See node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md.
 *
 * While the values differ from the defaults, the page's LeaveGuardProvider
 * (if any) asks before following a link or unloading the page
 * (`confirm: false` turns it off), and before Back/Forward where the
 * browser's Navigation API lets it be cancelled.
 */
export function useResetOnLeave(
  form: AnyFormApi,
  { confirm = true }: { confirm?: boolean } = {},
) {
  useLeaveGuard(
    () => !form.state.isDefaultValue && !form.state.isSubmitting,
    confirm,
  );
  useLayoutEffect(() => () => form.reset(), [form]);
}

import type { AnyFormApi } from "@tanstack/react-form-nextjs";
import { useLayoutEffect } from "react";

/**
 * Resets a form when its page is left, so coming back always starts fresh.
 *
 * With Cache Components, Next.js keeps recently visited pages mounted but
 * hidden (React <Activity>) instead of unmounting them, so a form would
 * keep its values, errors and any password typed in. Activity runs effect
 * cleanups when it hides a page, and this one resets the form there.
 * See node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md.
 */
export function useResetOnLeave(form: AnyFormApi) {
  useLayoutEffect(() => () => form.reset(), [form]);
}

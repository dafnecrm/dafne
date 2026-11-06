"use client";

import { useLayoutEffect } from "react";
import { applySavedTheme, THEME_SCRIPT } from "../lib/theme";

/**
 * Applies the saved theme before the first paint. Put it in the root <head>.
 *
 * On the server it is a normal script, run while the HTML is parsed. When the
 * layout renders in the browser (e.g. a locale change), React would warn about
 * a <script>: there it is an inert `text/plain` block, and the effect applies
 * the theme instead.
 */
export function ThemeScript() {
  useLayoutEffect(applySavedTheme, []);
  return (
    <script
      type={typeof window === "undefined" ? undefined : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}

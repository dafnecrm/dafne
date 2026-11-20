import { useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * The name of a resource documents are made for ("quotation" → "Quotation"),
 * or the resource itself when the app has no text for it yet. The same
 * function while the language stays (for memoized table columns).
 */
export function useResourceLabel() {
  const t = useTranslations("documentTemplates.resources");
  return useCallback(
    (resource: string) => (t.has(resource as "quotation") ? t(resource as "quotation") : resource),
    [t],
  );
}

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { MessageKey } from "./keys";

/**
 * Option lists keep message keys as labels (plain data, shared by server and
 * client). This gives the same options with their labels translated, for
 * selects and comboboxes.
 */
export function useOptionLabels<T extends { label: MessageKey }>(
  options: readonly T[],
) {
  const t = useTranslations();
  return useMemo(
    () => options.map((option) => ({ ...option, label: t(option.label) })),
    [options, t],
  );
}

/** The translated label of `value` in `options`, or "—" when none matches. */
export function useOptionLabel() {
  const t = useTranslations();
  return <T extends { value: string; label: MessageKey }>(
    options: readonly T[],
    value: string | null | undefined,
  ) => {
    const option = options.find((o) => o.value === value);
    return option ? t(option.label) : "—";
  };
}

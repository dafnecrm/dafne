import { createFormHook } from "@tanstack/react-form-nextjs";
import { useLocale } from "next-intl";
import type { ComponentType } from "react";
import { z } from "zod";
import { en, it } from "zod/locales";
import { FIELD_COMPONENTS, FORM_COMPONENTS } from "./components.ts";
import { fieldContext, formContext } from "./form-context.ts";

const ZOD_LOCALES = { en, it };

/**
 * Builds a form hook (TanStack's createFormHook) with the generic fields
 * plus `fieldComponents` (e.g. a lib's CountrySelectField), and Zod's own
 * messages (too long, wrong type…) in the user's language. Contract
 * messages are keys, translated where they're shown (useErrorText). Every
 * hook shares the same contexts, so the fields work in any of them.
 */
export function createAppFormHook<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T extends Record<string, ComponentType<any>>,
>(fieldComponents: T) {
  const { useAppForm: useBaseAppForm } = createFormHook({
    fieldContext,
    formContext,
    fieldComponents: { ...FIELD_COMPONENTS, ...fieldComponents },
    formComponents: FORM_COMPONENTS,
  });
  const useAppForm: typeof useBaseAppForm = (options) => {
    const locale = useLocale() as keyof typeof ZOD_LOCALES;
    z.config((ZOD_LOCALES[locale] ?? en)());
    return useBaseAppForm(options);
  };
  return useAppForm;
}

/**
 * The form hook with the generic fields only. Forms that need a feature
 * lib's field (e.g. CountrySelectField) use a hook of their own, made with
 * createAppFormHook.
 */
export const useAppForm = createAppFormHook({});

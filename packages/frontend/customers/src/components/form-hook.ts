import { createAppFormHook } from "@dafne/frontend-forms/client";
import { CountrySelectField } from "@dafne/frontend-geo/components/country-select-field";

/** The customer forms' hook: the generic fields plus the country picker. */
export const useAppForm = createAppFormHook({ CountrySelectField });

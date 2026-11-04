"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { countryName } from "@/lib/country-name";
import { listCountries, type ListedCountry } from "@/lib/geo";

/*
 * Countries come from the backend (GET /geo/countries) once per page load,
 * shared by every CountrySelect and CountryName on the page.
 */

let countriesPromise: Promise<ListedCountry[]> | undefined;

function loadCountries() {
  countriesPromise ??= listCountries().catch((error: unknown) => {
    // Let the next component try again.
    countriesPromise = undefined;
    throw error;
  });
  return countriesPromise;
}

/**
 * The countries, named and sorted in the user's language (Intl.DisplayNames,
 * else the backend's name); undefined while they load (or if that failed).
 */
export function useCountries() {
  const locale = useLocale();
  const [loaded, setCountries] = useState<ListedCountry[]>();
  useEffect(() => {
    let current = true;
    loadCountries().then(
      (list) => current && setCountries(list),
      () => {},
    );
    return () => {
      current = false;
    };
  }, []);
  return useMemo(() => {
    if (!loaded) return undefined;
    return loaded
      .map((country) => ({
        ...country,
        name: countryName(country.code, locale, country.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [loaded, locale]);
}

/** A country's name from its ISO code, e.g. "IT" → "Italia" (the code until the list loads). */
export function CountryName({ code }: { code: string }) {
  const countries = useCountries();
  return <>{countries?.find((c) => c.code === code)?.name ?? code}</>;
}

/**
 * Picks a country by typing part of its name. The value is the country's
 * ISO 3166-1 alpha-2 code ("IT"), "" when none is chosen.
 */
export function CountrySelect({
  value,
  onValueChange,
  id,
  name,
  placeholder,
  disabled,
  className,
  onBlur,
  "aria-invalid": ariaInvalid,
}: {
  value: string;
  onValueChange: (code: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
}) {
  const t = useTranslations("geo");
  const countries = useCountries();
  const selected = countries?.find((c) => c.code === value) ?? null;

  return (
    <Combobox
      items={countries ?? []}
      value={selected}
      onValueChange={(country: ListedCountry | null) =>
        onValueChange(country?.code ?? "")
      }
      itemToStringLabel={(country: ListedCountry) => country.name}
      isItemEqualToValue={(a: ListedCountry, b: ListedCountry) =>
        a.code === b.code
      }
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={
          countries ? (placeholder ?? t("countryPlaceholder")) : t("loadingCountries")
        }
        className={className}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        onBlur={onBlur}
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("noCountries")}</ComboboxEmpty>
        <ComboboxList>
          {(country: ListedCountry) => (
            <ComboboxItem key={country.code} value={country}>
              {country.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

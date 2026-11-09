"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@dafne/frontend-ui/components/combobox";
import { getProductOption, ProductOption, searchProducts } from "../actions.ts";

/** Wait after the last keystroke before searching, so typing isn't a request per key. */
const SEARCH_DELAY_MS = 250;

/** How many matches the list shows. */
const SEARCH_LIMIT = 20;

/**
 * Picks a product by typing part of its name: the backend searches
 * (GET /products?name=…, through a server action) as the user types. The
 * value is the product's ID, null when none is chosen. `onProductChange` gets the whole product the user picks
 * (e.g. to show its name elsewhere).
 */
export function ProductSelect({
  value,
  onValueChange,
  onProductChange,
  id,
  name,
  placeholder,
  disabled,
  className,
  onBlur,
  "aria-invalid": ariaInvalid,
}: {
  value: number | null;
  onValueChange: (id: number | null) => void;
  onProductChange?: (product: ProductOption | null) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
}) {
  const t = useTranslations("products");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [searching, setSearching] = useState(true);
  const [chosen, setChosen] = useState<ProductOption | null>(null);

  // Search when the text changes; only the latest search lands.
  useEffect(() => {
    let current = true;
    const timer = setTimeout(
      () =>
        searchProducts({ name: query, limit: SEARCH_LIMIT }).then(
          (list) => current && setResults(list),
          () => current && setResults([]),
        ).finally(() => current && setSearching(false)),
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  // A value set from outside (e.g. editing an order): load its name.
  useEffect(() => {
    if (value == null || chosen?.id === value) return;
    let current = true;
    getProductOption(String(value)).then(
      (product) => current && setChosen(product),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [value, chosen]);

  const selected = value != null && chosen?.id === value ? chosen : null;

  return (
    <Combobox
      items={results}
      // The backend already filtered them.
      filter={null}
      value={selected}
      onValueChange={(product: ProductOption | null) => {
        setChosen(product);
        onValueChange(product?.id ?? null);
        onProductChange?.(product);
      }}
      onInputValueChange={(text) => {
        setQuery(text);
        setSearching(true);
      }}
      itemToStringLabel={(product: ProductOption) => product.name}
      isItemEqualToValue={(a: ProductOption, b: ProductOption) =>
        a.id === b.id
      }
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder ?? t("productPlaceholder")}
        className={className}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        showClear
        onBlur={onBlur}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {searching ? t("loadingProducts") : t("noProducts")}
        </ComboboxEmpty>
        <ComboboxList>
          {(product: ProductOption) => (
            <ComboboxItem key={product.id} value={product}>
              {product.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

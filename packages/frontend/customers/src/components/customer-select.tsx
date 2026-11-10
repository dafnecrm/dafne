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
import {
  getCustomerOption,
  searchCustomers,
  type CustomerOption,
} from "../actions.ts";

/** Wait after the last keystroke before searching, so typing isn't a request per key. */
const SEARCH_DELAY_MS = 250;

/** How many matches the list shows. */
const SEARCH_LIMIT = 20;

/**
 * Picks a customer by typing part of their name: the backend searches
 * (GET /customers?name=…, through a server action) as the user types. The
 * value is the customer's ID as text (form values are strings), "" when
 * none is chosen.
 */
export function CustomerSelect({
  value,
  option,
  onValueChange,
  id,
  name,
  placeholder,
  disabled,
  className,
  onBlur,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
}: {
  value: string;
  /** The value\'s customer, when the caller has it: no lookup to name it. */
  option?: CustomerOption | null;
  onValueChange: (id: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
  /** For a picker with no visible label, e.g. a table filter. */
  "aria-label"?: string;
}) {
  const t = useTranslations("customers");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [searching, setSearching] = useState(true);
  const [chosen, setChosen] = useState<CustomerOption | null>(option ?? null);
  // No search until the list is first opened: most visits never open it.
  const [opened, setOpened] = useState(false);

  // Search when the text changes; only the latest search lands.
  useEffect(() => {
    if (!opened) return;
    let current = true;
    const timer = setTimeout(
      () =>
        searchCustomers({ name: query, limit: SEARCH_LIMIT }).then(
          (list) => current && setResults(list),
          () => current && setResults([]),
        ).finally(() => current && setSearching(false)),
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, opened]);

  // A value set from outside (e.g. editing an order): load its name.
  useEffect(() => {
    if (!value || String(chosen?.id) === value) return;
    let current = true;
    getCustomerOption(value).then(
      (customer) => current && setChosen(customer),
      () => {},
    );
    return () => {
      current = false;
    };
  }, [value, chosen]);

  const selected = value && String(chosen?.id) === value ? chosen : null;

  return (
    <Combobox
      items={results}
      // The backend already filtered them.
      filter={null}
      onOpenChange={(open) => open && setOpened(true)}
      value={selected}
      onValueChange={(customer: CustomerOption | null) => {
        setChosen(customer);
        onValueChange(customer ? String(customer.id) : "");
      }}
      onInputValueChange={(text) => {
        setQuery(text);
        setSearching(true);
      }}
      itemToStringLabel={(customer: CustomerOption) => customer.name}
      isItemEqualToValue={(a: CustomerOption, b: CustomerOption) =>
        a.id === b.id
      }
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder ?? t("customerPlaceholder")}
        className={className}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        showClear
        onBlur={onBlur}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {searching ? t("loadingCustomers") : t("noCustomers")}
        </ComboboxEmpty>
        <ComboboxList>
          {(customer: CustomerOption) => (
            <ComboboxItem key={customer.id} value={customer}>
              {customer.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

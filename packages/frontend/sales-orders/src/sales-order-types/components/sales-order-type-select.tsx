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
  getSalesOrderTypeOption,
  searchSalesOrderTypes,
  type SalesOrderTypeOption,
} from "../actions.ts";

/** Wait after the last keystroke before searching, so typing isn't a request per key. */
const SEARCH_DELAY_MS = 250;

/** How many matches the list shows. */
const SEARCH_LIMIT = 20;

/**
 * Picks a sales order type by typing part of their name: the backend searches
 * (GET /sales-order-types?name=…, through a server action) as the user types. The
 * value is the sales order type's ID as text (form values are strings), "" when
 * none is chosen.
 */
export function SalesOrderTypeSelect({
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
  /** The value\'s sales order type, when the caller has it: no lookup to name it. */
  option?: SalesOrderTypeOption | null;
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
  const t = useTranslations("salesOrders.salesOrderTypes");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SalesOrderTypeOption[]>([]);
  const [searching, setSearching] = useState(true);
  const [chosen, setChosen] = useState<SalesOrderTypeOption | null>(option ?? null);
  // No search until the list is first opened: most visits never open it.
  const [opened, setOpened] = useState(false);

  // Search when the text changes; only the latest search lands.
  useEffect(() => {
    if (!opened) {
      return;
    }
    let current = true;
    const timer = setTimeout(
      () =>
        searchSalesOrderTypes({ description: query, limit: SEARCH_LIMIT }).then(
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
    if (!value || String(chosen?.id) === value) {
      return;
    }
    let current = true;
    getSalesOrderTypeOption(value).then(
      (type) => current && setChosen(type),
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
      onValueChange={(soType: SalesOrderTypeOption | null) => {
        setChosen(soType);
        onValueChange(soType ? String(soType.id) : "");
      }}
      onInputValueChange={(text) => {
        setQuery(text);
        setSearching(true);
      }}
      itemToStringLabel={(soType: SalesOrderTypeOption) => soType.description}
      isItemEqualToValue={(a: SalesOrderTypeOption, b: SalesOrderTypeOption) =>
        a.id === b.id
      }
      name={name}
      disabled={disabled}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder ?? t("placeholder")}
        className={className}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        showClear
        onBlur={onBlur}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {searching ? t("loading") : t("none")}
        </ComboboxEmpty>
        <ComboboxList>
          {(soType: SalesOrderTypeOption) => (
            <ComboboxItem key={soType.id} value={soType}>
              {soType.description}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@dafne/frontend-ui/components/combobox";
import { searchUsers, type UserOption } from "../actions.ts";

/** Wait after the last keystroke before searching. */
const SEARCH_DELAY_MS = 250;

/**
 * Picks several users by typing part of their name or email (searched on
 * apps/auth as the user types); the chosen ones show as chips.
 */
export function UserMultiSelect({
  value,
  onValueChange,
  id,
  onBlur,
  "aria-invalid": ariaInvalid,
}: {
  value: UserOption[];
  onValueChange: (users: UserOption[]) => void;
  id?: string;
  onBlur?: () => void;
  "aria-invalid"?: boolean;
}) {
  const t = useTranslations("userGroups.members");
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOption[]>([]);
  const [searching, setSearching] = useState(true);
  // No search until the list is first opened.
  const [opened, setOpened] = useState(false);

  // Only the latest search lands.
  useEffect(() => {
    if (!opened) {
      return;
    }
    let current = true;
    const timer = setTimeout(
      () =>
        searchUsers(query)
          .then(
            (users) => current && setResults(users),
            () => current && setResults([]),
          )
          .finally(() => current && setSearching(false)),
      query ? SEARCH_DELAY_MS : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, opened]);

  return (
    <Combobox
      multiple
      items={results}
      // The backend already filtered them.
      filter={null}
      value={value}
      onValueChange={(users: UserOption[]) => onValueChange(users)}
      onOpenChange={(open) => open && setOpened(true)}
      onInputValueChange={(text) => {
        setQuery(text);
        setSearching(true);
      }}
      itemToStringLabel={(user: UserOption) => user.name}
      isItemEqualToValue={(a: UserOption, b: UserOption) => a.id === b.id}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(users: UserOption[]) =>
            users.map((user) => (
              <ComboboxChip key={user.id} title={user.email}>
                {user.name}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput
          id={id}
          placeholder={value.length ? undefined : t("search")}
          aria-invalid={ariaInvalid}
          onBlur={onBlur}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{searching ? "…" : t("empty")}</ComboboxEmpty>
        <ComboboxList>
          {(user: UserOption) => (
            <ComboboxItem key={user.id} value={user}>
              <span className="grid">
                <span>{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

"use client";

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

export interface GroupOption {
  id: number;
  name: string;
}

/** Picks several user groups from a short list, filtered as the user types. */
export function GroupMultiSelect({
  groups,
  value,
  onValueChange,
  id,
  placeholder,
  emptyText,
  "aria-invalid": ariaInvalid,
}: {
  groups: GroupOption[];
  /** The chosen groups' ids. */
  value: number[];
  onValueChange: (ids: number[]) => void;
  id?: string;
  placeholder?: string;
  emptyText: string;
  "aria-invalid"?: boolean;
}) {
  const anchor = useComboboxAnchor();
  const chosen = groups.filter((group) => value.includes(group.id));

  return (
    <Combobox
      multiple
      items={groups}
      value={chosen}
      onValueChange={(next: GroupOption[]) => onValueChange(next.map((group) => group.id))}
      itemToStringLabel={(group: GroupOption) => group.name}
      isItemEqualToValue={(a: GroupOption, b: GroupOption) => a.id === b.id}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(selected: GroupOption[]) =>
            selected.map((group) => <ComboboxChip key={group.id}>{group.name}</ComboboxChip>)
          }
        </ComboboxValue>
        <ComboboxChipsInput id={id} placeholder={chosen.length ? undefined : placeholder} aria-invalid={ariaInvalid} />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(group: GroupOption) => (
            <ComboboxItem key={group.id} value={group}>
              {group.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

"use client";

import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { MapPinIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { searchPlaces, type GeoPlace } from "@/lib/geo";

/** Waits this long after the last keystroke before searching. */
const DEBOUNCE_MS = 300;
/** Shorter searches match too much: the backend isn't asked. */
const MIN_LENGTH = 3;

/**
 * Looks up places (OpenStreetMap, through the backend) while the user types,
 * and hands the chosen one to `onSelect`. The input empties after a pick:
 * it's a way to fill other fields, not a value of its own.
 */
export function PlaceSearch({
  id,
  placeholder,
  onSelect,
}: {
  id?: string;
  placeholder?: string;
  onSelect: (place: GeoPlace) => void;
}) {
  const t = useTranslations("geo");
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<GeoPlace[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Ignores the answer if the user typed again meanwhile.
    let current = true;
    const timer = setTimeout(async () => {
      if (query.trim().length < MIN_LENGTH) {
        setPlaces([]);
        setError(undefined);
        return;
      }
      setLoading(true);
      const result = await searchPlaces(query);
      if (!current) return;
      setPlaces(result.places);
      setError(result.error);
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const empty = error
    ? error
    : loading
      ? t("searching")
      : query.trim().length < MIN_LENGTH
        ? t("tooShort", { min: MIN_LENGTH })
        : t("noPlaces");

  return (
    <Combobox
      items={places}
      // The backend already matched them: show every result.
      filter={null}
      value={null}
      inputValue={query}
      onInputValueChange={(value) => setQuery(value)}
      onValueChange={(place: GeoPlace | null) => {
        if (!place) return;
        onSelect(place);
        setQuery("");
        setPlaces([]);
      }}
      itemToStringLabel={(place: GeoPlace) => place.label}
      isItemEqualToValue={(a: GeoPlace, b: GeoPlace) => a.id === b.id}
    >
      <InputGroup>
        <InputGroupAddon>
          {loading ? <Spinner /> : <SearchIcon />}
        </InputGroupAddon>
        <ComboboxPrimitive.Input
          id={id}
          placeholder={placeholder ?? t("searchPlaceholder")}
          render={<InputGroupInput />}
        />
      </InputGroup>
      <ComboboxContent>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {(place: GeoPlace) => (
            <ComboboxItem key={place.id} value={place}>
              <MapPinIcon className="text-muted-foreground" />
              <span className="truncate">{place.label}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

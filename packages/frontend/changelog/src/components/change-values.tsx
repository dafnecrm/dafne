"use client";

import type { ChangedField, ChangeOperation } from "@dafne/contracts";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { diffList, diffListElements, formatChangeValue } from "../values.ts";

/*
 * Ready-made ways to show a field in ChangelogSheet (`value` or `summary`
 * of a ChangeFieldConfig).
 */

/**
 * Just "added" (on a create) or "edited": for long values (rich text) a
 * diff wouldn't help.
 */
export function EditedSummary({ operation }: { operation: ChangeOperation }) {
  const t = useTranslations("changelog");
  return operation === "create" ? t("set") : t("edited");
}

/**
 * How a list changed, its elements matched by `itemKey`: "1 added, 2
 * changed" (only the counts above zero).
 */
export function ListChangeSummary({ change, itemKey }: { change: ChangedField; itemKey: string }) {
  const t = useTranslations("changelog");
  const { added, removed, changed } = diffList(change.from, change.to, itemKey);
  const parts = [
    added > 0 && t("added", { count: added }),
    removed > 0 && t("removed", { count: removed }),
    changed > 0 && t("changed", { count: changed }),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : t("edited");
}

/** Gives a record's name by id, or null when it no longer exists. */
export type ResolveName = (id: string) => Promise<string | null>;

/**
 * Caches `load` (e.g. a server action reading the record): one call per
 * id, failures giving null. Create it once per page (useState), so every
 * ResolvedName of an id shares one call.
 */
export function nameCache(load: ResolveName): ResolveName {
  const cache = new Map<string, Promise<string | null>>();
  return (id) => {
    let name = cache.get(id);
    if (!name) {
      name = load(id).catch(() => null);
      cache.set(id, name);
    }
    return name;
  };
}

/**
 * The name of the record `id` refers to; "#id" while loading or when gone.
 * Looked up after rendering: `resolve` is often a server action, and
 * calling one while rendering updates the router mid-render.
 */
export function ResolvedName({ id, resolve }: { id: unknown; resolve: ResolveName }) {
  const key = id === null || id === undefined || id === "" ? null : String(id);
  const [resolved, setResolved] = useState<{ key: string; name: string | null } | null>(null);
  useEffect(() => {
    if (key === null) {
      return;
    }
    let current = true;
    void resolve(key).then((name) => {
      if (current) {
        setResolved({ key, name });
      }
    });
    return () => {
      current = false;
    };
  }, [key, resolve]);

  if (key === null) {
    return "—";
  }
  return (resolved?.key === key ? resolved.name : null) ?? `#${key}`;
}

/** How ListChangeDetails shows a field of the list's elements. */
export interface ElementFieldConfig {
  /** The field's name, translated. */
  label: string;
  /** One of its values (default: formatChangeValue). */
  value?: (value: unknown) => ReactNode;
}

/**
 * What changed in a list, one line per element (matched by `itemKey`):
 * "<itemLabel>: added: Product: X, Quantity: 2", "<itemLabel>: Quantity:
 * 12 → 126", "<itemLabel>: removed". `fields` names the elements' fields,
 * in this order (the key and the fields left out aren't shown).
 */
export function ListChangeDetails({
  change,
  itemKey,
  itemLabel,
  fields,
}: {
  change: ChangedField;
  itemKey: string;
  itemLabel: (key: unknown) => ReactNode;
  fields: Record<string, ElementFieldConfig>;
}) {
  const t = useTranslations("changelog");
  const changes = diffListElements(change.from, change.to, itemKey);
  if (changes.length === 0) {
    return t("edited");
  }
  const show = (field: string, value: unknown) => (fields[field]?.value ?? formatChangeValue)(value);
  const order = Object.keys(fields);
  return (
    <span className="mt-1 flex flex-col gap-0.5">
      {changes.map((element) => (
        <span key={String(element.key)}>
          <span className="text-foreground">{itemLabel(element.key)}</span>
          {": "}
          {element.kind === "removed" && t("element.removed")}
          {element.kind === "added" && (
            <>
              {t("element.added")}
              {order.map((field) => (
                <Fragment key={field}>
                  {", "}
                  {fields[field].label}: <span className="text-foreground">{show(field, element.element[field])}</span>
                </Fragment>
              ))}
            </>
          )}
          {element.kind === "changed" &&
            element.fields
              .filter(({ field }) => field in fields)
              .sort((a, b) => order.indexOf(a.field) - order.indexOf(b.field))
              .map(({ field, from, to }, index) => (
                <Fragment key={field}>
                  {index > 0 && ", "}
                  {fields[field].label}:{" "}
                  <span className="line-through decoration-muted-foreground/50">{show(field, from)}</span>
                  {" → "}
                  <span className="text-foreground">{show(field, to)}</span>
                </Fragment>
              ))}
        </span>
      ))}
    </span>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  formatDate,
  localeFor,
  type DateFormat,
} from "@/lib/dates";

const subscribe = () => () => {};

/**
 * The viewer's time zone, e.g. "Europe/Rome". Null on the server and during
 * hydration (the server can't know it), then set on the next render.
 */
export function useTimeZone() {
  return useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    () => null,
  );
}

/**
 * The date-fns locale for the browser's languages, or Italian when none is
 * supported. Italian on the server and during hydration, so the server's
 * HTML matches, then the browser's on the next render.
 */
export function useDateLocale() {
  return useSyncExternalStore(
    subscribe,
    () => localeFor(navigator.languages),
    () => DEFAULT_LOCALE,
  );
}

/**
 * A date in the viewer's locale and time zone. The server renders a hidden UTC
 * placeholder (same size, no hydration mismatch), replaced in the browser.
 */
export function LocalDate({
  value,
  format = "date",
  className,
}: {
  /** A Date or a JSON date string. */
  value: string | Date;
  format?: DateFormat;
  className?: string;
}) {
  const locale = useDateLocale();
  const timeZone = useTimeZone();
  const iso = new Date(value).toISOString();

  return (
    <time
      dateTime={iso}
      title={timeZone ? undefined : iso}
      className={timeZone ? className : `invisible ${className ?? ""}`}
    >
      {formatDate(value, format, { locale, timeZone: timeZone ?? "UTC" })}
    </time>
  );
}

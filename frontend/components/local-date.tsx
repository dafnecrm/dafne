"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { formatDate, localeFor, type DateFormat } from "@/lib/dates";

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
 * The date-fns locale of the app's language. In the browser, a regional
 * variant the user prefers is used when it's the same language ("en-GB"
 * for English); the server and hydration use the plain language, so the
 * server's HTML matches.
 */
export function useDateLocale() {
  const language = useLocale();
  return useSyncExternalStore(
    subscribe,
    () =>
      localeFor([
        ...navigator.languages.filter((tag) => tag.split("-")[0] === language),
        language,
      ]),
    () => localeFor([language]),
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

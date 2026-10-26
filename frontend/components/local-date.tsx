"use client";

import { useSyncExternalStore } from "react";
import { formatDate, type DateFormat } from "@/lib/dates";

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
 * A date in the viewer's time zone. The server renders a hidden UTC
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
  const timeZone = useTimeZone();
  const iso = new Date(value).toISOString();

  return (
    <time
      dateTime={iso}
      title={timeZone ? undefined : iso}
      className={timeZone ? className : `invisible ${className ?? ""}`}
    >
      {formatDate(value, format, timeZone ?? "UTC")}
    </time>
  );
}

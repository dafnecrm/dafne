import { tz } from "@date-fns/tz";
import { formatDate as format } from "date-fns";
import { it } from "date-fns/locale";

/** Date formats used across the app (date-fns patterns, Italian locale). */
const FORMATS = {
  /** 3 ott 2026 */
  date: "d MMM yyyy",
  /** 3 ottobre 2026 */
  longDate: "d MMMM yyyy",
  /** 3 ott 2026, 14:05 */
  dateTime: "d MMM yyyy, HH:mm",
} satisfies Record<string, string>;

export type DateFormat = keyof typeof FORMATS;

/**
 * Formats a date (a Date or a JSON date string) in Italian, in the given
 * time zone. Pass the viewer's zone (see useTimeZone in
 * components/local-date.tsx): on the server it defaults to the server's own
 * zone.
 */
export function formatDate(
  value: string | Date,
  dateFormat: DateFormat = "date",
  timeZone?: string,
) {
  return format(value, FORMATS[dateFormat], {
    locale: it,
    ...(timeZone && { in: tz(timeZone) }),
  });
}

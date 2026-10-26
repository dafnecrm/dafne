/** Date formats used across the app. */
const FORMATS = {
  /** 3 Oct 2026 */
  date: { day: "numeric", month: "short", year: "numeric" },
  /** 3 October 2026 */
  longDate: { day: "numeric", month: "long", year: "numeric" },
  /** 3 Oct 2026, 14:05 */
  dateTime: {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateFormat = keyof typeof FORMATS;

/**
 * Formats a date (a Date or a JSON date string) in the given time zone.
 * Pass the viewer's zone (see useTimeZone in components/local-date.tsx):
 * on the server it defaults to the server's own zone.
 */
export function formatDate(
  value: string | Date,
  format: DateFormat = "date",
  timeZone?: string,
) {
  return new Date(value).toLocaleString("en-GB", {
    ...FORMATS[format],
    timeZone,
  });
}

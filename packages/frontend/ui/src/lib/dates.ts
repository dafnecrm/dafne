import { tz } from "@date-fns/tz";
import { formatDate as format, type Locale } from "date-fns";
import { de, enGB, enUS, es, fr, it } from "date-fns/locale";

/**
 * Date formats used across the app: date-fns localized patterns, so the
 * order and punctuation follow the locale. Examples in Italian / en-US.
 */
const FORMATS = {
  /** 3 ott 2026 / Oct 3, 2026 */
  date: "dd/MM/yyyy",
  /** 3 ottobre 2026 / October 3rd, 2026 */
  longDate: "dd MMMM yyyy",
  /** 3 ott 2026, 14:05 / Oct 3, 2026, 2:05 PM */
  dateTime: "dd/MM/yyyy, HH:mm",
} satisfies Record<string, string>;

export type DateFormat = keyof typeof FORMATS;

/** Used on the server and when the browser's languages aren't supported. */
export const DEFAULT_LOCALE = it;

/** Supported locales, by language tag. Add one here to support it. */
const LOCALES: Record<string, Locale> = {
  it,
  en: enUS,
  "en-US": enUS,
  "en-GB": enGB,
  fr,
  de,
  es,
};

/**
 * The first supported locale among `languages` (e.g. navigator.languages),
 * by exact tag ("en-GB") or else language ("en-AU" → "en").
 */
export function localeFor(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const locale = LOCALES[tag] ?? LOCALES[tag.split("-")[0]];
    if (locale) return locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Formats a date (a Date or a JSON date string). Pass the viewer's locale
 * and time zone (see useDateLocale and useTimeZone in
 * components/local-date.tsx): on the server the locale defaults to Italian
 * and the zone to the server's own.
 */
export function formatDate(
  value: string | Date,
  dateFormat: DateFormat = "date",
  { locale = DEFAULT_LOCALE, timeZone }: { locale?: Locale; timeZone?: string } = {},
) {
  return format(value, FORMATS[dateFormat], {
    locale,
    ...(timeZone && { in: tz(timeZone) }),
  });
}

"use client";

import { useDateLocale } from "@dafne/frontend-ui/components/local-date";
import { formatDate, type DateFormat } from "@dafne/frontend-ui/lib/dates";

/**
 * A calendar date (birth date, …) as stored on the server, without a time:
 * read in UTC, so it is the same day in every time zone. Only the format
 * follows the viewer's locale. Use LocalDate for instants (createdAt, …).
 */
export function PlainDate({
  value,
  format = "date",
  className,
}: {
  /** A Date or a JSON date string ("1980-01-01" or "1980-01-01T00:00:00.000Z"). */
  value: string | Date;
  format?: Exclude<DateFormat, "dateTime">;
  className?: string;
}) {
  const locale = useDateLocale();

  return (
    <time dateTime={new Date(value).toISOString().slice(0, 10)} className={className}>
      {formatDate(value, format, { locale, timeZone: "UTC" })}
    </time>
  );
}

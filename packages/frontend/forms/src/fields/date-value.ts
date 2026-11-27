/** "YYYY-MM-DD" to a local Date (midnight), or undefined when blank/invalid. */
export function parseDateValue(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return undefined
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** A local Date to "YYYY-MM-DD". */
export function toDateValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * An instant (an ISO string) in the local time zone: its day as a local
 * Date (midnight) and its time as "HH:mm". Blank when missing or invalid.
 */
export function toLocalDateTime(value: string | null | undefined) {
  const instant = value ? new Date(value) : undefined
  if (!instant || Number.isNaN(instant.getTime())) {
    return { date: undefined, time: '' }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: new Date(instant.getFullYear(), instant.getMonth(), instant.getDate()),
    time: `${pad(instant.getHours())}:${pad(instant.getMinutes())}`,
  }
}

/** A local day and "HH:mm" ("" is 00:00) to the instant, as a UTC ISO string. */
export function toUtcInstant(date: Date, time: string) {
  const [hours = 0, minutes = 0] = (time || '00:00').split(':').map(Number)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes
  ).toISOString()
}

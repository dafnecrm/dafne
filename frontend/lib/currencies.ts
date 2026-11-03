/**
 * Formats an amount in euros for `locale` (the app's language, e.g. from
 * useLocale()): "1.234,50 €" in Italian, "€1,234.50" in English.
 */
export function formatCurrency(value: string | number, locale: string) {
  return Intl.NumberFormat(locale, {
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: 'always',
    currency: "EUR"
  }).format(Number(value));
}

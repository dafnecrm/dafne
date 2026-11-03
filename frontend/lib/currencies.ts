/**
 * Formats a currency.
 */
export function formatCurrency(value: string | number) {
  return Intl.NumberFormat("it-IT", {
    style: "currency",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: 'always',
    currency: "EUR"
  }).format(Number(value));
}

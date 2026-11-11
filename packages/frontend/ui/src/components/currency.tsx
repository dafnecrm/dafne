import { useLocale } from "next-intl";
import { formatCurrency } from "../lib/currencies"

function Currency({
  value
}: {
  value: string | number | null,
}) {
  const language = useLocale();
  return value 
    ? formatCurrency(value, language)
    : '-'
}

export {
  Currency
}
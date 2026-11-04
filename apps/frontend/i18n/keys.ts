import type { Messages } from "next-intl";

type Paths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

/**
 * A full message key, e.g. "customers.fields.name". Plain-data modules
 * (table configs, option lists) hold these instead of text; components
 * translate them with `useTranslations()`. Type-only: no bundle cost.
 */
export type MessageKey = Paths<Messages>;

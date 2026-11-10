import { en } from "./en.ts";
import { it } from "./it.ts";

export type { ProductsMessageKey, ProductsMessages } from "./en.ts";

/**
 * The product texts, by language. Each app merges them under `products`
 * in its next-intl messages (i18n/request.ts) and in its `Messages` type
 * (i18n/global.d.ts).
 */
export const PRODUCTS_MESSAGES = { en, it };
export type ProductsLocale = keyof typeof PRODUCTS_MESSAGES;

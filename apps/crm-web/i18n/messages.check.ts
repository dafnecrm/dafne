import type en from "../messages/en.json";
import type it from "../messages/it.json";

/*
 * Compile-time check that both languages have the same keys: a key missing
 * from it.json (or only in it.json) fails `tsc`.
 */
type Keys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${Keys<T[K]>}`;
}[keyof T & string];

type Missing<A, B> = Exclude<Keys<A>, Keys<B>>;

export const missingInItalian: [Missing<typeof en, typeof it>] extends [never]
  ? true
  : Missing<typeof en, typeof it> = true;
export const missingInEnglish: [Missing<typeof it, typeof en>] extends [never]
  ? true
  : Missing<typeof it, typeof en> = true;

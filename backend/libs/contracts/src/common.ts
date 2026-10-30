import { z } from 'zod';

/** Required text: trimmed, so a blank value fails with `error`. */
export const requiredText = (max: number, error: string) =>
  z.string().trim().min(1, { error }).max(max);

/**
 * Optional text: trimmed, and blank, null or missing all become null, so a
 * form can send "" for an empty field. `inner` validates the rest.
 */
export const optionalText = <T extends z.ZodType<string, string>>(inner: T) =>
  z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(inner.nullable())
    .nullish()
    .transform((value) => value ?? null);

/** limit and offset of a paged list, from the query string. */
export const pageQuery = {
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
};

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/**
 * A response type as the client receives it: JSON has no dates, so every
 * Date becomes an ISO string.
 */
export type Json<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Json<U>[]
    : T extends object
      ? { [K in keyof T]: Json<T[K]> }
      : T;

/**
 * Optional date: blank, null or missing all become null, so a form can send
 * "" for an empty date field. Anything else must be a valid date.
 */
export const optionalDate = (error: string) =>
  z
    .preprocess(
      (value) => (value === '' || value == null ? null : value),
      z.coerce.date({ error }).nullable(),
    )
    // Without it the key is required in z.input (preprocess takes unknown).
    .optional()
    .transform((value) => value ?? null);

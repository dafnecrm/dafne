import { z } from 'zod';
import type { ContractMessageKey } from './messages/index.ts';

/** Required text: trimmed, so a blank value fails with `error` (a message key). */
export const requiredText = (max: number, error: ContractMessageKey) =>
  z.string().trim().min(1, { error }).max(max);

/** Required number. */
export const requiredNumber = (error: ContractMessageKey) =>
  z.coerce.number({ error });

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
export const optionalDate = (error: ContractMessageKey) =>
  z
    .preprocess(
      (value) => (value === '' || value == null ? null : value),
      z.coerce.date({ error }).nullable(),
    )
    // Without it the key is required in z.input (preprocess takes unknown).
    .optional()
    .transform((value) => value ?? null);

/** A form sends ids as text: "" is no value, other text becomes a number (NaN fails). */
const idFromText = (value: unknown) =>
  typeof value === 'string'
    ? value.trim() === ''
      ? null
      : Number(value.trim())
    : value;

/** The id of another record (a serial column): a positive integer. */
const id = (error: ContractMessageKey) =>
  z.number({ error }).int({ error }).positive({ error });

/**
 * Required reference to another record, e.g. an order's customerId: its id,
 * as a number or as the text a form sends. Blank fails with `error`.
 */
export const requiredId = (error: ContractMessageKey) =>
  z.preprocess((value) => idFromText(value) ?? undefined, id(error));

/**
 * Optional reference to another record: blank, null or missing all become
 * null; anything else must be an id.
 */
export const optionalId = (error: ContractMessageKey) =>
  z
    .preprocess(idFromText, id(error).nullable())
    // Without it the key is required in z.input (preprocess takes unknown).
    .optional()
    .transform((value) => value ?? null);

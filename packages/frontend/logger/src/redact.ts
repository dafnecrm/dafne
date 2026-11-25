import type { LogAttributes } from "./levels.ts";

/** Keys whose values never leave the app: credentials and personal data. */
const SENSITIVE = /pass(word)?|secret|token|cookie|authorization|e-?mail|phone|iban|fiscal|vat/i;

export const REDACTED = "[redacted]";

function text(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/**
 * A line's attributes as strings (Faro's log context takes nothing else),
 * with sensitive keys masked and `undefined` dropped. An Error under `error`
 * gives `error` (its message) and `stack`.
 */
export function redact(attributes: LogAttributes | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes ?? {})) {
    if (value === undefined) {
      continue;
    }
    if (SENSITIVE.test(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = text(value);
    if (key === "error" && value instanceof Error && value.stack) {
      out.stack = value.stack;
    }
  }
  return out;
}

/** A URL without its query string and hash (search terms, tokens in links). */
export function stripQuery(url: string): string {
  return url.split(/[?#]/, 1)[0];
}

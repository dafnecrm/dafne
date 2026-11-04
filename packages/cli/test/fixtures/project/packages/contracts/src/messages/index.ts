import { en, type ContractMessageKey } from './en.ts';
import { it } from './it.ts';

export type { ContractMessageKey, ContractMessages } from './en.ts';

/** The contracts' texts, by language. */
export const CONTRACT_MESSAGES = { en, it };
export type ContractLocale = keyof typeof CONTRACT_MESSAGES;

/**
 * A message key, checked at compile time. Contracts use keys instead of
 * text, e.g. `requiredText(255, msg('customers.name.required'))`; the
 * frontend and the backend translate them.
 */
export const msg = <K extends ContractMessageKey>(key: K) => key;

/** The text of `key` in `locale`, or null when it isn't a known key. */
export function translateMessage(
  key: string,
  locale: ContractLocale,
): string | null {
  let node: unknown = CONTRACT_MESSAGES[locale];
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return null;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : null;
}

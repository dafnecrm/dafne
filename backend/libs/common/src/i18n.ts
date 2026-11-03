import {
  CONTRACT_MESSAGES,
  translateMessage,
  type ContractLocale,
} from '@app/contracts';
import { z } from 'zod';

export const LOCALES = Object.keys(CONTRACT_MESSAGES) as ContractLocale[];
export const DEFAULT_LOCALE: ContractLocale = 'it';

/**
 * The first supported language of an Accept-Language header ("it-IT,en;q=0.8"),
 * by language only, or the default.
 */
export function localeFrom(acceptLanguage: string | undefined): ContractLocale {
  const tags = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split('=')[1]) : 1 };
    })
    .filter(({ tag, q }) => tag && q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const language = tag.split('-')[0] as ContractLocale;
    if (LOCALES.includes(language)) return language;
  }
  return DEFAULT_LOCALE;
}

/** Zod's own messages (too long, wrong type…) in `locale`. */
export const zodErrorMap = (locale: ContractLocale) =>
  z.locales[locale]().localeError;

/**
 * Translates an error message that is a contract key, also in the
 * "path: key" form of validation errors. Other text is returned as is.
 */
export function translate(message: string, locale: ContractLocale): string {
  const whole = translateMessage(message, locale);
  if (whole) return whole;
  const at = message.lastIndexOf(': ');
  if (at < 0) return message;
  const text = translateMessage(message.slice(at + 2), locale);
  return text ? `${message.slice(0, at)}: ${text}` : message;
}

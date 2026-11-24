import { UnprocessableEntityException } from '@nestjs/common';
import { msg, type DocumentTemplateError } from '@dafne/contracts';
import Docxtemplater from 'docxtemplater';
import expressions from 'docxtemplater/expressions.js';
import PizZip from 'pizzip';

// Its .d.ts declares `export default`, its file sets `module.exports`: the
// default import is the parser itself, which TypeScript sees as `.default`.
const expressionParser = expressions as unknown as typeof expressions.default;

/** A Date, or a string or number a Date can be built from. */
function toDate(input: unknown): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'string' || typeof input === 'number') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** A number, or a numeric string (decimals come from the database as text). */
function toNumber(input: unknown): number | null {
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input === 'string' && input.trim() !== '') {
    const value = Number(input);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

/**
 * The filters a template can use, formatting in `locale`:
 * `{total | currency}` (or `currency:"USD"`), `{quantity | number:3}`,
 * `{validUntil | date}`, `{createdAt | datetime}`, `{name | upper}`,
 * `{name | lower}`. A value they can't read is left as it is.
 */
export function documentFilters(locale: string) {
  return {
    currency: (input: unknown, currency = 'EUR') => {
      const value = toNumber(input);
      return value === null ? input : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
    },
    number: (input: unknown, digits = 2) => {
      const value = toNumber(input);
      return value === null
        ? input
        : new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
    },
    date: (input: unknown) => {
      const date = toDate(input);
      return date === null ? input : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
    },
    datetime: (input: unknown) => {
      const date = toDate(input);
      return date === null
        ? input
        : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    },
    countryName: (input: unknown) => {
      const value = String(input);
      return value === null 
      ? input
      : new Intl.DisplayNames([locale], { type: "region" }).of(value) ?? input;
    },
    upper: (input: unknown) => (typeof input === 'string' ? input.toUpperCase() : input),
    lower: (input: unknown) => (typeof input === 'string' ? input.toLowerCase() : input),
  };
}

/** The errors docxtemplater gives, one per tag at fault. */
function templateErrors(error: unknown): DocumentTemplateError[] {
  const properties = (error as { properties?: { errors?: unknown[] } }).properties;
  const errors = properties?.errors ?? [error];
  return errors.map((item) => {
    const details = (item as { properties?: { xtag?: string; explanation?: string } }).properties;
    return {
      tag: details?.xtag ?? null,
      explanation: details?.explanation ?? (item instanceof Error ? item.message : String(item)),
    };
  });
}

/** A 422 that lists what is wrong with a template, so the admin can fix it in Word. */
function invalidTemplate(errors: DocumentTemplateError[]) {
  return new UnprocessableEntityException({ message: msg('documentTemplates.file.invalid'), errors });
}

/**
 * Fills a Word template with `data`: `{customer.name}` puts a value,
 * `{#items}…{/items}` repeats its body per element (a table row when it
 * is in one), `{#notes}…{/notes}` shows its body only when `notes` is set,
 * and the filters of `documentFilters` format values. Missing values are
 * left empty. Templates are expressions, never code: they can only read
 * `data`. Throws 422 (with the errors) for a file that isn't a .docx or a
 * template docxtemplater can't read.
 */
export function fillDocx(template: Buffer, data: object, locale: string): Buffer {
  let zip: PizZip;
  try {
    zip = new PizZip(template);
  } catch {
    throw new UnprocessableEntityException(msg('documentTemplates.file.notDocx'));
  }
  let document: Docxtemplater;
  try {
    document = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
      parser: expressionParser.configure({ filters: documentFilters(locale) }),
    });
  } catch (error) {
    // A zip that isn't a Word document, or tags that don't parse.
    if ((error as { properties?: unknown }).properties) {
      throw invalidTemplate(templateErrors(error));
    }
    throw new UnprocessableEntityException(msg('documentTemplates.file.notDocx'));
  }
  try {
    document.render(data);
  } catch (error) {
    throw invalidTemplate(templateErrors(error));
  }
  return document.toBuffer({ compression: 'DEFLATE' });
}

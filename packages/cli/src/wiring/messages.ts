import { applyEdits, modify, parse } from 'jsonc-parser';
import { Node, type ObjectLiteralExpression, type SourceFile } from 'ts-morph';
import type { Changes } from '../core/changes.ts';
import { casings, words, type ResourceNames } from '../core/names.ts';
import { appendToList, editSource, quoteOf, variableObject } from './ast.ts';
import { BACKEND_LIBS, CONTRACTS_SRC, FRONTEND } from '../core/workspace.ts';

/*
 * Translated texts. Generated code holds message keys, never text:
 *   - the frontend calls t("invoices.fields.name"), and table configs hold
 *     keys as labels; the texts are in apps/crm-web/messages/<locale>.json;
 *   - contracts and services use msg('invoices.name.required'); the texts
 *     are in packages/contracts/src/messages/<locale>.ts.
 * After a run, `syncMessages` adds the keys the changed files use and the
 * catalogs lack, with an English text derived from the key. Italian gets
 * the same English text, to be translated by hand. Existing keys are never
 * changed, so it's idempotent.
 */

export const LOCALES = ['en', 'it'] as const;
export const FRONTEND_MESSAGES = (locale: string) => `${FRONTEND}/messages/${locale}.json`;
export const CONTRACT_MESSAGES = (locale: string) => `${CONTRACTS_SRC}/messages/${locale}.ts`;

/** Key → English text. */
export type MessageMap = Map<string, string>;

const lower = (key: string) => casings(words(key)).lower;
const title = (key: string) => casings(words(key)).title;

/** Sections, empty states… of a resource: never an enum field's values. */
const RESERVED = new Set(['fields', 'sections', 'empty']);

/** Texts of a new resource's own keys (titles, empty state, errors). */
export function resourceMessages({ s, p }: ResourceNames): { frontend: MessageMap; contracts: MessageMap } {
  const ns = p.camel;
  const frontend: MessageMap = new Map([
    [`${ns}.title`, p.title],
    [`${ns}.singular`, s.title],
    [`${ns}.new`, `New ${s.lower}`],
    [`${ns}.all`, `All ${p.lower}`],
    [`${ns}.noun`, p.lower],
    [`${ns}.create`, `Create ${s.lower}`],
    [`${ns}.editMeta`, `Edit ${s.lower}`],
    [`${ns}.newDescription`, 'Only the name is required.'],
    [`${ns}.editDescription`, `Saving replaces the ${s.lower}'s details.`],
    [`${ns}.empty.title`, `No ${p.lower} found`],
    [`${ns}.empty.filtered`, `No ${s.lower} where {filter}.`],
    [`${ns}.empty.none`, `Add your first ${s.lower} to get started.`],
    [`${ns}.deleteDescription`, `The ${s.lower} will no longer be listed or editable.`],
    [`${ns}.notFound`, `This ${s.lower} no longer exists.`],
    [`${ns}.sections.details`, 'Details'],
    [`${ns}.fields.name`, 'Name'],
    [`${ns}.fields.createdAt`, 'Added'],
    [`${ns}.fields.id`, `${s.title} ID`],
  ]);
  const contracts: MessageMap = new Map([[`${ns}.notFound`, `${s.title} not found`]]);
  return { frontend, contracts };
}

/** A default English text for a frontend key, or undefined when none fits. */
export function frontendText(key: string): string | undefined {
  const parts = key.split('.');
  if (parts.length !== 3) return undefined;
  const [, group, leaf] = parts;
  if (group === 'fields' || group === 'sections') return title(leaf);
  if (!RESERVED.has(group)) return title(leaf); // an enum value: invoices.status.paid
  return undefined;
}

/**
 * A default English text for a contract key. `enumField`: the key is the
 * error of a z.enum (a choice, not something typed in).
 */
export function contractText(key: string, enumField = false): string | undefined {
  const parts = key.split('.');
  if (parts.length < 3) return undefined;
  const rule = parts[parts.length - 1];
  const what = lower(parts[parts.length - 2]);
  if (rule === 'required') return `${enumField ? 'Choose' : 'Enter'} the ${what}`;
  if (rule === 'invalid') return `Enter a valid ${what}`;
  return undefined;
}

/** t("…") calls and `label: "…"` keys of a frontend file. */
export function frontendKeys(source: string): string[] {
  const keys = new Set<string>();
  for (const m of source.matchAll(/\bt\(\s*["']([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)["']/g)) keys.add(m[1]);
  for (const m of source.matchAll(/\b(?:label|placeholder): "([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)"/g)) keys.add(m[1]);
  return [...keys];
}

/** msg('…') keys of a backend file, and whether each is a z.enum's error. */
export function contractKeys(source: string): { key: string; enumField: boolean }[] {
  const found = new Map<string, boolean>();
  for (const m of source.matchAll(/msg\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    // The z.enum( this msg belongs to, if any: no other call in between.
    // Prettier may break `z.enum(` over lines (`z\n  .enum(`).
    const before = source.slice(0, m.index);
    const enumAt = Math.max(-1, ...[...before.matchAll(/z\s*\.\s*enum\(/g)].map((e) => e.index));
    const enumField = enumAt >= 0 && !/\)\s*[,;]|\n\s*\w+:/.test(before.slice(enumAt));
    found.set(m[1], (found.get(m[1]) ?? false) || enumField);
  }
  return [...found].map(([key, enumField]) => ({ key, enumField }));
}

/** The leaves of a JSON object: "a.b" → text. */
function jsonHas(tree: unknown, key: string): boolean {
  let node = tree;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return true;
}

/** Adds the missing keys to frontend/messages/<locale>.json. Returns how many. */
export function ensureFrontendMessages(changes: Changes, messages: MessageMap): number {
  let added = 0;
  for (const locale of LOCALES) {
    const path = FRONTEND_MESSAGES(locale);
    if (!changes.exists(path)) continue;
    changes.update(path, (source) => {
      for (const [key, text] of messages) {
        if (jsonHas(parse(source), key)) continue;
        const edits = modify(source, key.split('.'), text, {
          formattingOptions: { insertSpaces: true, tabSize: 2 },
        });
        source = applyEdits(source, edits);
        if (locale === 'it') added++;
      }
      return source;
    });
  }
  return added;
}

const propertyName = (key: string) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`);

/** The property `name` of an object literal, if it holds an object or a string. */
function child(object: ObjectLiteralExpression, name: string) {
  for (const prop of object.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    if (prop.getName().replace(/^['"]|['"]$/g, '') !== name) continue;
    return prop.getInitializer();
  }
  return undefined;
}

/** Adds `path` = `text` under the object, creating the objects on the way. */
function ensurePath(file: SourceFile, root: () => ObjectLiteralExpression, path: string[], text: string) {
  let object = root();
  for (let i = 0; i < path.length; i++) {
    const node = child(object, path[i]);
    if (node && Node.isObjectLiteralExpression(node)) {
      object = node;
      continue;
    }
    if (node) return; // a text already: keep it
    const q = quoteOf(file);
    const value = `${q}${text.replace(new RegExp(q, 'g'), `\\${q}`)}${q}`;
    const nested = path
      .slice(i + 1)
      .reduceRight((inner, part) => `{ ${propertyName(part)}: ${inner} }`, value);
    appendToList(file, object, object.getProperties(), `${propertyName(path[i])}: ${nested}`);
    return;
  }
}

/** Adds the missing keys to the contracts' en.ts and it.ts. Returns how many. */
export function ensureContractMessages(changes: Changes, messages: MessageMap): number {
  let added = 0;
  for (const locale of LOCALES) {
    const path = CONTRACT_MESSAGES(locale);
    if (!changes.exists(path)) continue;
    changes.update(path, (source) => {
      for (const [key, text] of messages) {
        const before = source;
        source = editSource(path, source, (file) =>
          ensurePath(file, () => variableObject(file, locale), key.split('.'), text),
        );
        if (source !== before && locale === 'it') added++;
      }
      return source;
    });
  }
  return added;
}

/**
 * Adds the keys used by the files of this run (and `seed`, e.g. a new
 * resource's titles) to the catalogs. Returns (and adds to the warnings)
 * a note about the Italian texts left in English, if any.
 */
export function syncMessages(
  changes: Changes,
  seed: { frontend?: MessageMap; contracts?: MessageMap } = {},
) {
  const frontend: MessageMap = new Map(seed.frontend);
  const contracts: MessageMap = new Map(seed.contracts);
  for (const { path } of changes.summary()) {
    const source = changes.read(path) ?? '';
    if (path.startsWith(`${FRONTEND}/`) && /\.tsx?$/.test(path)) {
      for (const key of frontendKeys(source)) {
        const text = frontendText(key);
        if (text && !frontend.has(key)) frontend.set(key, text);
      }
    } else if ((path.startsWith(`${BACKEND_LIBS}/`) || path.startsWith(`${CONTRACTS_SRC}/`)) && /\.ts$/.test(path) && !path.includes('/messages/')) {
      for (const { key, enumField } of contractKeys(source)) {
        const text = contractText(key, enumField);
        if (text && !contracts.has(key)) contracts.set(key, text);
      }
    }
  }
  const untranslated =
    ensureFrontendMessages(changes, frontend) + ensureContractMessages(changes, contracts);
  if (!untranslated) return undefined;
  const note =
    `${untranslated} new message${untranslated === 1 ? '' : 's'} in the Italian catalogs ` +
    `(${FRONTEND_MESSAGES('it')}, ${CONTRACT_MESSAGES('it')}) ${untranslated === 1 ? 'is' : 'are'} still in English: translate ${untranslated === 1 ? 'it' : 'them'}.`;
  changes.warn(note);
  return note;
}

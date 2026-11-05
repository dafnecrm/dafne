import { Node, SyntaxKind } from 'ts-morph';
import { casings, words, type ResourceNames } from '../core/names.ts';
import { editSource } from '../wiring/ast.ts';
import type { TableInfo } from './table.ts';

/*
 * The response fields of a contract (Listed<S> and <S>Detail), for the
 * list and detail pages. Shared by `sync frontend table` and `detail`.
 */

export type ResponseKind = 'text' | 'id' | 'number' | 'boolean' | 'date' | 'datetime' | 'enum';

export interface ResponseField {
  key: string;
  kind: ResponseKind;
  /** The type has `| null`. */
  optional: boolean;
  label: string;
  /** In Listed<S> (else only in <S>Detail). */
  listed: boolean;
  /** HTML from the rich text editor (`@form editor` on the column). */
  richText?: boolean;
  enumConst?: string;
  enumType?: string;
  values?: string[];
}

export interface ResponseInfo {
  fields: ResponseField[];
  /** Members skipped: relations, arrays, objects… */
  skipped: string[];
  sortFields: string[];
  filterFields: string[];
}

export function readResponse(path: string, contract: string, names: ResourceNames, table?: TableInfo): ResponseInfo {
  const { s } = names;
  const info: ResponseInfo = { fields: [], skipped: [], sortFields: [], filterFields: [] };
  editSource(path, contract, (file) => {
    const enums = new Map<string, { constant: string; values: string[] }>();
    for (const alias of file.getTypeAliases()) {
      const constant = /^\(typeof(\w+)\)\[number\]$/.exec(alias.getTypeNode()?.getText().replace(/\s/g, '') ?? '')?.[1];
      const array = constant && file.getVariableDeclaration(constant)?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
      if (constant && array)
        enums.set(alias.getName(), { constant, values: array.getElements().filter(Node.isStringLiteral).map((e) => e.getLiteralValue()) });
    }

    const strings = (name: string) =>
      file
        .getVariableDeclaration(name)
        ?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression)
        ?.getElements()
        .filter(Node.isStringLiteral)
        .map((e) => e.getLiteralValue()) ?? [];
    info.sortFields = strings(`${s.constant}_SORT_FIELDS`);
    info.filterFields = strings(`${s.constant}_FILTER_FIELDS`);

    for (const [name, listed] of [[`Listed${s.pascal}`, true], [`${s.pascal}Detail`, false]] as const) {
      const iface = file.getInterface(name);
      if (!iface) throw new Error(`${path}: no ${name} interface.`);
      for (const prop of iface.getProperties()) {
        const key = prop.getName();
        const type = prop.getTypeNodeOrThrow().getText().replace(/\s/g, '');
        const optional = /\|null$/.test(type);
        const base = type.replace(/\|null$/, '');
        const column = table?.columns.find((c) => c.key === key);
        let kind: ResponseKind | undefined;
        if (base === 'string') kind = /Id$/.test(key) ? 'id' : column?.kind === 'date' ? 'date' : column?.kind === 'datetime' ? 'datetime' : 'text';
        else if (base === 'number') kind = 'number';
        else if (base === 'boolean') kind = 'boolean';
        else if (base === 'Date') kind = column?.kind === 'date' ? 'date' : 'datetime';
        else if (enums.has(base)) kind = 'enum';
        if (!kind) {
          info.skipped.push(key);
          continue;
        }
        // customerId → "Customer".
        const label = casings(words(kind === 'id' ? key.replace(/Id$/, '') : key)).title;
        const field: ResponseField = { key, kind, optional, label, listed };
        if (kind === 'text' && column?.kind === 'text' && column.formInput === 'editor') field.richText = true;
        if (kind === 'enum') {
          const e = enums.get(base)!;
          Object.assign(field, { enumType: base, enumConst: e.constant, values: e.values });
        }
        info.fields.push(field);
      }
    }
  });
  return info;
}

/** Keys named in `dafne-ignore: a, b` comments (JSX, block or line). */
export function ignoredKeys(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/dafne-ignore:\s*([\w ,]+?)\s*(?:\*\/|\r?\n|$)/g)].flatMap((m) =>
      m[1].split(/[\s,]+/).filter(Boolean),
    ),
  );
}

/** ACTIVITY_TYPE_OPTIONS: the labels of an enum, in lib/<plural>-table.ts. */
export const enumOptionsName = (names: ResourceNames, field: ResponseField) =>
  `${names.s.constant}_${casings(words(field.key)).constant}_OPTIONS`;

export const optionLabel = (value: string) => casings(words(value)).title;

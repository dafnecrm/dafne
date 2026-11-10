import { Node, type SourceFile, SyntaxKind } from 'ts-morph';
import { casings, words, type ResourceNames } from '../core/names.ts';
import { editSource } from '../wiring/ast.ts';
import type { TableInfo } from './table.ts';

/* The fields of a contract's body schema, as the form (and the specs' samples) see them. */

export type FormKind =
  | 'text'
  | 'textarea'
  | 'editor'
  | 'email'
  | 'enum'
  | 'boolean'
  | 'number'
  | 'decimal'
  | 'date'
  | 'datetime'
  /** A reference to another record: its id (requiredId/optionalId), sent as text. */
  | 'id'
  /** A uuid (requiredUuid/optionalUuid), e.g. a key to a record with a uuid id. */
  | 'uuid'
  | 'unsupported';

export interface FormField {
  key: string;
  kind: FormKind;
  /** The contract accepts null: the input may be left empty. */
  optional: boolean;
  label: string;
  /** enum: ACTIVITY_TYPES, ActivityType and the values. */
  enumConst?: string;
  enumType?: string;
  values?: string[];
  /** Literal passed to .default(...) in the contract. */
  defaultValue?: string;
  /** The contract itself has a .default(...): a missing value isn't null. */
  contractDefault?: boolean;
}

/** The fields of `<s>BodySchema`, with what the form needs to know. */
export function readBody(path: string, contract: string, names: ResourceNames, table?: TableInfo): FormField[] {
  const fields: FormField[] = [];
  editSource(path, contract, (file) => {
    const body = file
      .getVariableDeclaration(`${names.s.camel}BodySchema`)
      ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
    if (!body) {
      throw new Error(`${path}: no ${names.s.camel}BodySchema = z.strictObject({...}).`);
    }
    for (const prop of body.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) {
        continue;
      }
      const key = prop.getName();
      const zod = prop.getInitializerOrThrow().getText();
      const field = classify(key, zod, table);
      if (field.enumConst) {
        const array = file.getVariableDeclaration(field.enumConst)?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression);
        field.values = array?.getElements().filter(Node.isStringLiteral).map((e) => e.getLiteralValue());
        const alias = file
          .getTypeAliases()
          .find((t) => t.getTypeNode()?.getText().replace(/\s/g, '') === `(typeof${field.enumConst})[number]`);
        field.enumType = alias?.getName();
        if (!field.values?.length || !field.enumType) {
          field.kind = 'unsupported';
        }
      }
      fields.push(field);
    }
  });
  return fields;
}

function classify(key: string, raw: string, table?: TableInfo): FormField {
  // Prettier may break `z.number().int()` over lines.
  const zod = raw.replace(/\s*\n\s*/g, '');
  const label = casings(words(key)).title;
  // `.optional()` alone means "has a default in the table": the input
  // starts at that default and can't be empty; null makes it optional.
  const nullable = /\.(nullish|nullable)\(/.test(zod);
  const column = table?.columns.find((c) => c.key === key);
  const defaultValue = /\.default\(([^)]*)\)/.exec(zod)?.[1]?.trim() ?? column?.defaultValue;
  const dateKind: FormKind = column?.kind === 'datetime' ? 'datetime' : 'date';
  const base = { key, label, defaultValue, contractDefault: /\.default\(/.test(zod) };
  // A `text` column (65535 chars in the contract) gets a multi-line input:
  // a textarea, or a rich text editor with `@form editor`.
  const textKind: FormKind = column
    ? column.kind !== 'text' ? 'text' : column.formInput === 'editor' ? 'editor' : 'textarea'
    : /\b65535\b/.test(zod) ? 'textarea' : 'text';

  if (/^z\.(array|object|strictObject|record|unknown|any)\(/.test(zod)) {
    return { ...base, kind: 'unsupported', optional: true };
  }
  if (zod.startsWith('optionalText(')) {
    if (/z\.iso\.datetime\(/.test(zod)) {
      return { ...base, kind: 'datetime', optional: true };
    }
    if (/z\.iso\.date\(/.test(zod)) {
      return { ...base, kind: 'date', optional: true };
    }
    return { ...base, kind: /z\.email\(/.test(zod) ? 'email' : textKind, optional: true };
  }
  if (zod.startsWith('requiredText(')) {
    return { ...base, kind: /z\.email\(/.test(zod) ? 'email' : textKind, optional: false };
  }
  if (zod.startsWith('optionalDate(')) {
    return { ...base, kind: dateKind, optional: true };
  }
  if (zod.startsWith('requiredId(')) {
    return { ...base, kind: 'id', optional: /^requiredId\([^)]*\)\)?\.optional\(/.test(zod) };
  }
  if (zod.startsWith('optionalId(')) {
    return { ...base, kind: 'id', optional: true };
  }
  if (zod.startsWith('requiredUuid(')) {
    return { ...base, kind: 'uuid', optional: /^requiredUuid\([^)]*\)\)?\.optional\(/.test(zod) };
  }
  if (zod.startsWith('optionalUuid(')) {
    return { ...base, kind: 'uuid', optional: true };
  }
  const enumConst = /^z\.enum\((\w+)/.exec(zod)?.[1];
  if (enumConst) {
    return { ...base, kind: 'enum', optional: nullable, enumConst };
  }
  if (zod.startsWith('z.boolean(')) {
    return { ...base, kind: 'boolean', optional: nullable };
  }
  if (/^z\.(coerce\.)?number\(/.test(zod)) {
    return { ...base, kind: 'number', optional: nullable };
  }
  if (zod.startsWith('z.coerce.date(') || zod.startsWith('z.date(')) {
    return { ...base, kind: dateKind, optional: nullable };
  }
  if (zod.startsWith('z.iso.datetime(')) {
    return { ...base, kind: 'datetime', optional: nullable };
  }
  if (zod.startsWith('z.iso.date(')) {
    return { ...base, kind: 'date', optional: nullable };
  }
  if (/^z\.string\(\)\.regex\(\/\^-\?\\d/.test(zod)) {
    return { ...base, kind: 'decimal', optional: nullable };
  }
  if (zod.startsWith('z.string(') || zod.startsWith('z.email(')) {
    return { ...base, kind: zod.startsWith('z.email(') ? 'email' : textKind, optional: nullable };
  }
  return { ...base, kind: 'unsupported', optional: true };
}


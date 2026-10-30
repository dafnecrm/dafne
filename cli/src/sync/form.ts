import { Node, type SourceFile, SyntaxKind } from 'ts-morph';
import { casings, words, type ResourceNames } from '../core/names.js';
import { appendToList, editSource, ensureNamedImport } from '../wiring/ast.js';
import type { TableInfo } from './table.js';

/*
 * Adds the body fields of a contract that a form lacks: to its values type,
 * its default values and its JSX. Nothing that's already there changes.
 */

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
}

export interface FormReport {
  added: string[];
  /** In the form but not in the contract body any more. */
  stale: string[];
  warnings: string[];
}

const newReport = (): FormReport => ({ added: [], stale: [], warnings: [] });

/** The fields of `<s>BodySchema`, with what the form needs to know. */
export function readBody(path: string, contract: string, names: ResourceNames, table?: TableInfo): FormField[] {
  const fields: FormField[] = [];
  editSource(path, contract, (file) => {
    const body = file
      .getVariableDeclaration(`${names.s.camel}BodySchema`)
      ?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
    if (!body) throw new Error(`${path}: no ${names.s.camel}BodySchema = z.strictObject({...}).`);
    for (const prop of body.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;
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
        if (!field.values?.length || !field.enumType) field.kind = 'unsupported';
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
  const base = { key, label, defaultValue };
  // A `text` column (65535 chars in the contract) gets a multi-line input:
  // a textarea, or a rich text editor with `@form editor`.
  const textKind: FormKind = column
    ? column.kind !== 'text' ? 'text' : column.formInput === 'editor' ? 'editor' : 'textarea'
    : /\b65535\b/.test(zod) ? 'textarea' : 'text';

  if (/^z\.(array|object|strictObject|record|unknown|any)\(/.test(zod)) return { ...base, kind: 'unsupported', optional: true };
  if (zod.startsWith('optionalText(')) {
    if (/z\.iso\.datetime\(/.test(zod)) return { ...base, kind: 'datetime', optional: true };
    if (/z\.iso\.date\(/.test(zod)) return { ...base, kind: 'date', optional: true };
    return { ...base, kind: /z\.email\(/.test(zod) ? 'email' : textKind, optional: true };
  }
  if (zod.startsWith('requiredText(')) return { ...base, kind: textKind, optional: false };
  if (zod.startsWith('optionalDate(')) return { ...base, kind: dateKind, optional: true };
  const enumConst = /^z\.enum\((\w+)/.exec(zod)?.[1];
  if (enumConst) return { ...base, kind: 'enum', optional: nullable, enumConst };
  if (zod.startsWith('z.boolean(')) return { ...base, kind: 'boolean', optional: nullable };
  if (/^z\.(coerce\.)?number\(/.test(zod)) return { ...base, kind: 'number', optional: nullable };
  if (zod.startsWith('z.coerce.date(') || zod.startsWith('z.date(')) return { ...base, kind: dateKind, optional: nullable };
  if (zod.startsWith('z.iso.datetime(')) return { ...base, kind: 'datetime', optional: nullable };
  if (zod.startsWith('z.iso.date(')) return { ...base, kind: 'date', optional: nullable };
  if (/^z\.string\(\)\.regex\(\/\^-\?\\d/.test(zod)) return { ...base, kind: 'decimal', optional: nullable };
  if (zod.startsWith('z.string(') || zod.startsWith('z.email(')) return { ...base, kind: zod.startsWith('z.email(') ? 'email' : textKind, optional: nullable };
  return { ...base, kind: 'unsupported', optional: true };
}

/** Form values are text, except these (users' role, a number…). */
const typed = (f: FormField) => f.kind === 'enum' || f.kind === 'boolean' || f.kind === 'number';

function valueType(f: FormField): string {
  if (f.kind === 'enum') return f.optional ? `${f.enumType} | null` : f.enumType!;
  if (f.kind === 'number') return f.optional ? 'number | null' : 'number';
  return 'boolean';
}

const optionsName = (f: FormField) => `${casings(words(f.key)).constant}_OPTIONS`;

/** Default value for a new record, and from `param` (the record being edited). */
function defaultValue(f: FormField, param?: string): string {
  const literal = (() => {
    if (f.defaultValue !== undefined) {
      if (f.kind === 'number' || f.kind === 'boolean') return f.defaultValue;
      if (/^['"`].*['"`]$/.test(f.defaultValue)) return `"${f.defaultValue.slice(1, -1).replace(/"/g, '\\"')}"`;
    }
    switch (f.kind) {
      case 'enum':
        return f.optional ? 'null' : `"${f.values![0]}"`;
      case 'boolean':
        return 'false';
      case 'number':
        return f.optional ? 'null' : '0';
      default:
        return '""';
    }
  })();
  if (!param) return literal;
  const from = `${param}?.${f.key}`;
  // Dates arrive as ISO strings; the inputs want "2026-10-29" / "2026-10-29T10:30".
  if (f.kind === 'date') return `${from}?.slice(0, 10) ?? ${literal}`;
  if (f.kind === 'datetime') return `${from}?.slice(0, 16) ?? ${literal}`;
  if (f.kind === 'decimal') return `${from} ?? ${literal}`;
  return `${from} ?? ${literal}`;
}

/**
 * schema.ts: the values type, the options of enums and the default values.
 * `responseKeys` are the fields the detail response has (others start empty).
 */
export function syncFormSchema(
  path: string,
  source: string,
  names: ResourceNames,
  fields: FormField[],
  responseKeys: Set<string>,
): { content: string; report: FormReport } {
  const report = newReport();
  const { s } = names;
  const usable = fields.filter((f) => f.kind !== 'unsupported');
  const step = (edit: (file: SourceFile) => void) => {
    source = editSource(path, source, edit);
  };

  // Values type: Record<Exclude<keyof Body, "a">, string> & { a: T }.
  step((file) => {
    const alias = file.getTypeAlias(`${s.pascal}FormValues`);
    if (!alias) return void report.warnings.push(`${path}: no ${s.pascal}FormValues type.`);
    const node = alias.getTypeNodeOrThrow();
    const parts = Node.isIntersectionTypeNode(node) ? node.getTypeNodes() : [node];
    const record = parts.find((t) => Node.isTypeReference(t) && t.getTypeName().getText() === 'Record');
    if (!record || !Node.isTypeReference(record))
      return void report.warnings.push(`${path}: ${s.pascal}FormValues isn't Record<keyof …, string> (& {...}): add the new fields to it by hand.`);
    const [keys] = record.getTypeArguments();
    let body: string;
    let excluded: string[] = [];
    if (Node.isTypeOperatorTypeNode(keys)) body = keys.getTypeNode().getText();
    else if (Node.isTypeReference(keys) && keys.getTypeName().getText() === 'Exclude') {
      const [all, removed] = keys.getTypeArguments();
      body = all.getText().replace(/^keyof\s+/, '');
      excluded = removed
        .getText()
        .split('|')
        .map((k) => k.trim().replace(/^["']|["']$/g, ''));
    } else return void report.warnings.push(`${path}: unexpected keys in ${s.pascal}FormValues: add the new fields by hand.`);

    const literal = parts.find(Node.isTypeLiteral);
    const members = literal?.getMembers().map((m) => m.getText(true)) ?? [];
    const memberNames = new Set(literal?.getProperties().map((m) => m.getName()) ?? []);
    const others = parts.filter((t) => t !== record && t !== literal).map((t) => t.getText());

    const newTyped = usable.filter((f) => typed(f) && !excluded.includes(f.key) && !memberNames.has(f.key));
    if (!newTyped.length) return;
    excluded.push(...newTyped.map((f) => f.key));
    members.push(...newTyped.map((f) => `${f.key}: ${valueType(f)};`));
    for (const f of newTyped) {
      if (f.kind === 'enum') ensureNamedImport(file, '@backend/contracts', f.enumType!, { typeOnly: true });
      report.added.push(`${s.pascal}FormValues: ${f.key}`);
    }
    const text = [
      `Record<Exclude<keyof ${body}, ${excluded.map((k) => `"${k}"`).join(' | ')}>, string>`,
      `{\n${members.map((m) => (/[;,]$/.test(m) ? m : `${m};`)).join('\n')}\n}`,
      ...others,
    ].join(' & ');
    // Re-find: the import above may have moved the node.
    const fresh = file.getTypeAliasOrThrow(`${s.pascal}FormValues`).getTypeNodeOrThrow();
    file.replaceText([fresh.getStart(), fresh.getEnd()], text);
  });

  // Options of enums, e.g. TYPE_OPTIONS, before the form options.
  for (const f of usable.filter((f) => f.kind === 'enum')) {
    step((file) => {
      const name = optionsName(f);
      if (file.getVariableDeclaration(name)) return;
      const options = f.values!.map((v) => `{ value: "${v}", label: "${casings(words(v)).title}" }`).join(',\n  ');
      const code = `export const ${name} = [\n  ${options},\n] satisfies { value: ${f.enumType}; label: string }[];\n\n`;
      const opts = formOptsNode(file, s.camel);
      const statement = opts?.getFirstAncestor((a) => a.getParent() === file) ?? opts;
      file.insertText(statement ? statement.getStart(true) : file.getEnd(), code);
      ensureNamedImport(file, '@backend/contracts', f.enumType!, { typeOnly: true });
      report.added.push(name);
    });
  }

  // Default values.
  step((file) => {
    const opts = formOptsNode(file, s.camel);
    const values = opts
      ?.getDescendantsOfKind(SyntaxKind.PropertyAssignment)
      .find((p) => p.getName() === 'defaultValues')
      ?.getInitializer();
    const object = values && (Node.isObjectLiteralExpression(values) ? values : values.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression));
    if (!object) return void report.warnings.push(`${path}: no defaultValues in ${s.camel}FormOpts.`);
    const param = opts && Node.isFunctionDeclaration(opts) ? opts.getParameters()[0]?.getName() : undefined;
    const present = new Set(object.getProperties().flatMap((p) => (Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p) ? [p.getName()] : [])));
    const missing = usable.filter((f) => !present.has(f.key));
    for (const f of missing) {
      const current = freshDefaults(file, s.camel);
      appendToList(file, current, current.getProperties(), `${f.key}: ${defaultValue(f, responseKeys.has(f.key) ? param : undefined)}`);
      report.added.push(`defaultValues: ${f.key}`);
    }
    const body = new Set(fields.map((f) => f.key));
    for (const key of present) if (!body.has(key)) report.stale.push(`defaultValues: ${key}`);
  });

  return { content: source, report };
}

function formOptsNode(file: SourceFile, singular: string): Node | undefined {
  return file.getFunction(`${singular}FormOpts`) ?? file.getVariableDeclaration(`${singular}FormOpts`);
}

function freshDefaults(file: SourceFile, singular: string) {
  const values = formOptsNode(file, singular)!
    .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
    .find((p) => p.getName() === 'defaultValues')!
    .getInitializerOrThrow();
  return Node.isObjectLiteralExpression(values) ? values : values.getFirstDescendantByKindOrThrow(SyntaxKind.ObjectLiteralExpression);
}

/** The JSX of a new field. */
function fieldJsx(f: FormField): string {
  const label = `${f.label}${f.optional && f.kind !== 'boolean' ? ' (optional)' : ''}`;
  const component = (() => {
    switch (f.kind) {
      case 'enum':
        return `<field.SelectField label="${label}" options={${optionsName(f)}} />`;
      case 'boolean':
        return `<field.CheckboxField label="${label}" />`;
      case 'number':
        return `<field.NumberField label="${label}" />`;
      case 'decimal':
        return `<field.TextField label="${label}" inputMode="decimal" autoComplete="off" />`;
      case 'email':
        return `<field.TextField label="${label}" type="email" autoComplete="off" />`;
      case 'date':
        return `<field.TextField label="${label}" type="date" />`;
      case 'datetime':
        return `<field.TextField label="${label}" type="datetime-local" />`;
      case 'textarea':
        return `<field.TextareaField label="${label}" />`;
      case 'editor':
        return `<field.TextEditorField label="${label}" />`;
      default:
        return `<field.TextField label="${label}" autoComplete="off" />`;
    }
  })();
  return `<form.AppField name="${f.key}">\n  {(field) => ${component}}\n</form.AppField>`;
}

/**
 * The form component: a <form.AppField> for each body field that has none,
 * after the last one, unless a `{/* dafne-ignore: key *\/}` comment says
 * the field has no input on purpose.
 */
export function syncFormComponent(path: string, source: string, fields: FormField[]): { content: string; report: FormReport } {
  const report = newReport();
  const ignored = new Set(
    [...source.matchAll(/dafne-ignore:\s*([\w\s,]+?)\s*\*\//g)].flatMap((m) => m[1].split(/[\s,]+/).filter(Boolean)),
  );
  const content = editSource(path, source, (file) => {
    const appFields = () =>
      file
        .getDescendantsOfKind(SyntaxKind.JsxElement)
        .filter((e) => e.getOpeningElement().getTagNameNode().getText() === 'form.AppField');
    const nameOf = (e: Node) => {
      if (!Node.isJsxElement(e)) return undefined;
      const attr = e.getOpeningElement().getAttribute('name');
      const init = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
      return init && Node.isStringLiteral(init) ? init.getLiteralValue() : undefined;
    };
    const present = new Set(appFields().map(nameOf).filter(Boolean) as string[]);
    const missing = fields.filter((f) => !present.has(f.key) && !ignored.has(f.key));

    const body = new Set(fields.map((f) => f.key));
    for (const name of present) if (!body.has(name) && !/[[.]/.test(name)) report.stale.push(`<form.AppField name="${name}">`);
    for (const f of missing.filter((f) => f.kind === 'unsupported'))
      report.warnings.push(`${f.key}: no input for this kind of field; add it by hand, or mark it {/* dafne-ignore: ${f.key} */}.`);

    for (const f of missing.filter((f) => f.kind !== 'unsupported')) {
      const topLevel = appFields().filter((e) => !e.getAncestors().some((a) => Node.isJsxElement(a) && a.getOpeningElement().getTagNameNode().getText() === 'form.AppField'));
      const last = topLevel[topLevel.length - 1];
      if (!last) {
        report.warnings.push(`${path}: no <form.AppField> to put ${f.key} next to; add it by hand.`);
        continue;
      }
      const text = file.getFullText();
      const lineStart = text.lastIndexOf('\n', last.getStart() - 1) + 1;
      const indent = /^[ \t]*/.exec(text.slice(lineStart))![0];
      file.insertText(last.getEnd(), `\n${indent}${fieldJsx(f).replace(/\n/g, `\n${indent}`)}`);
      if (f.kind === 'enum') ensureNamedImport(file, './schema', optionsName(f));
      report.added.push(`<form.AppField name="${f.key}">`);
    }
  });
  return { content, report };
}

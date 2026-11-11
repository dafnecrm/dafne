import { Node, type SourceFile, SyntaxKind } from 'ts-morph';
import { pageRefs, type PageRefs } from '../core/frontend-target.ts';
import { casings, words, type ResourceNames } from '../core/names.ts';
import type { FormField } from './body.ts';
import { appendToList, editSource, ensureHookLine, ensureNamedImport, removeJsxElement, removeListElement } from '../wiring/ast.ts';
import { CONTRACTS_PACKAGE } from '../wiring/backend.ts';

/*
 * Adds the body fields of a contract that a form lacks: to its values type,
 * its default values and its JSX. Nothing that's already there changes,
 * unless `prune`: then what the body no longer has is removed too.
 */

export interface FormReport {
  added: string[];
  /** Removed because the contract doesn't have it any more (with `prune`). */
  removed?: string[];
  /** In the form but not in the contract body any more (kept). */
  stale: string[];
  warnings: string[];
}

const newReport = (): FormReport => ({ added: [], removed: [], stale: [], warnings: [] });

/** Form values are text, except these (users' role, a number…). */
const typed = (f: FormField) => f.kind === 'enum' || f.kind === 'boolean' || f.kind === 'number';

function valueType(f: FormField): string {
  if (f.kind === 'enum') {
    return f.optional ? `${f.enumType} | null` : f.enumType!;
  }
  if (f.kind === 'number') {
    return f.optional ? 'number | null' : 'number';
  }
  return 'boolean';
}

const optionsName = (f: FormField) => `${casings(words(f.key)).constant}_OPTIONS`;

/** Default value for a new record, and from `param` (the record being edited). */
function defaultValue(f: FormField, param?: string): string {
  const literal = (() => {
    if (f.defaultValue !== undefined) {
      if (f.kind === 'number' || f.kind === 'boolean') {
        return f.defaultValue;
      }
      if (/^['"`].*['"`]$/.test(f.defaultValue)) {
        return `"${f.defaultValue.slice(1, -1).replace(/"/g, '\\"')}"`;
      }
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
  if (!param) {
    return literal;
  }
  const from = `${param}?.${f.key}`;
  // Dates arrive as ISO strings; the pickers want "2026-10-29" / "2026-10-29T10:30".
  if (f.kind === 'date') {
    return `${from}?.slice(0, 10) ?? ${literal}`;
  }
  if (f.kind === 'datetime') {
    return `${from}?.slice(0, 16) ?? ${literal}`;
  }
  if (f.kind === 'decimal') {
    return `${from} ?? ${literal}`;
  }
  // Ids are numbers; the input holds text.
  if (f.kind === 'id') {
    return `${from}?.toString() ?? ${literal}`;
  }
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
  { prune = false, refs = pageRefs(names) }: { prune?: boolean; refs?: PageRefs } = {},
): { content: string; report: FormReport } {
  const report = newReport();
  const { s } = names;
  const bodyKeys = new Set(fields.map((f) => f.key));
  const usable = fields.filter((f) => f.kind !== 'unsupported');
  const step = (edit: (file: SourceFile) => void) => {
    source = editSource(path, source, edit);
  };

  // Values type: Record<Exclude<keyof Body, "a">, string> & { a: T }.
  step((file) => {
    const alias = file.getTypeAlias(`${s.pascal}FormValues`);
    if (!alias) {
      return void report.warnings.push(`${path}: no ${s.pascal}FormValues type.`);
    }
    const node = alias.getTypeNodeOrThrow();
    const parts = Node.isIntersectionTypeNode(node) ? node.getTypeNodes() : [node];
    const record = parts.find((t) => Node.isTypeReference(t) && t.getTypeName().getText() === 'Record');
    if (!record || !Node.isTypeReference(record)) {
      return void report.warnings.push(`${path}: ${s.pascal}FormValues isn't Record<keyof …, string> (& {...}): add the new fields to it by hand.`);
    }
    const [keys] = record.getTypeArguments();
    let body: string;
    let excluded: string[] = [];
    if (Node.isTypeOperatorTypeNode(keys)) {
      body = keys.getTypeNode().getText();
    } else if (Node.isTypeReference(keys) && keys.getTypeName().getText() === 'Exclude') {
      const [all, removed] = keys.getTypeArguments();
      body = all.getText().replace(/^keyof\s+/, '');
      excluded = removed
        .getText()
        .split('|')
        .map((k) => k.trim().replace(/^["']|["']$/g, ''));
    } else {
      return void report.warnings.push(`${path}: unexpected keys in ${s.pascal}FormValues: add the new fields by hand.`);
    }

    const literal = parts.find(Node.isTypeLiteral);
    const members = literal?.getMembers().map((m) => m.getText(true)) ?? [];
    const memberNames = new Set(literal?.getProperties().map((m) => m.getName()) ?? []);
    const others = parts.filter((t) => t !== record && t !== literal).map((t) => t.getText());

    const newTyped = usable.filter((f) => typed(f) && !excluded.includes(f.key) && !memberNames.has(f.key));
    // Typed members of fields the body dropped: from the literal and the Exclude list.
    const gone = prune ? [...memberNames].filter((key) => !bodyKeys.has(key)) : [];
    if (!newTyped.length && !gone.length) {
      return;
    }
    if (gone.length) {
      excluded = excluded.filter((key) => !gone.includes(key));
      for (const key of gone) {
        report.removed!.push(`${s.pascal}FormValues: ${key}`);
      }
    }
    if (gone.length) {
      members.splice(
        0,
        members.length,
        ...(literal
          ?.getMembers()
          .filter((m) => !(Node.isPropertySignature(m) && gone.includes(m.getName())))
          .map((m) => m.getText(true)) ?? []),
      );
    }
    excluded.push(...newTyped.map((f) => f.key));
    members.push(...newTyped.map((f) => `${f.key}: ${valueType(f)};`));
    for (const f of newTyped) {
      if (f.kind === 'enum') {
        ensureNamedImport(file, CONTRACTS_PACKAGE, f.enumType!, { typeOnly: true });
      }
      report.added.push(`${s.pascal}FormValues: ${f.key}`);
    }
    const keysText = excluded.length ? `Exclude<keyof ${body}, ${excluded.map((k) => `"${k}"`).join(' | ')}>` : `keyof ${body}`;
    const text = [
      `Record<${keysText}, string>`,
      ...(members.length ? [`{\n${members.map((m) => (/[;,]$/.test(m) ? m : `${m};`)).join('\n')}\n}`] : []),
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
      // Declared here, or re-exported (`export { CUSTOMER_TYPE_OPTIONS as TYPE_OPTIONS } from …`).
      const exported = file
        .getExportDeclarations()
        .some((d) => d.getNamedExports().some((e) => (e.getAliasNode()?.getText() ?? e.getName()) === name));
      if (file.getVariableDeclaration(name) || exported) {
        return;
      }
      // Labels are message keys, translated by the form (useOptionLabels).
      const options = f.values!.map((v) => `{ value: "${v}", label: "${names.p.camel}.${f.key}.${v}" }`).join(',\n  ');
      const keyType = refs.messageKey;
      const code = `export const ${name} = [\n  ${options},\n] satisfies { value: ${f.enumType}; label: ${keyType.name} }[];\n\n`;
      const opts = formOptsNode(file, s.camel);
      const statement = opts?.getFirstAncestor((a) => a.getParent() === file) ?? opts;
      file.insertText(statement ? statement.getStart(true) : file.getEnd(), code);
      ensureNamedImport(file, CONTRACTS_PACKAGE, f.enumType!, { typeOnly: true });
      ensureNamedImport(file, keyType.module, keyType.name, { typeOnly: true });
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
    if (!object) {
      return void report.warnings.push(`${path}: no defaultValues in ${s.camel}FormOpts.`);
    }
    const param = opts && Node.isFunctionDeclaration(opts) ? opts.getParameters()[0]?.getName() : undefined;
    const present = new Set(object.getProperties().flatMap((p) => (Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p) ? [p.getName()] : [])));
    const missing = usable.filter((f) => !present.has(f.key));
    for (const f of missing) {
      const current = freshDefaults(file, s.camel);
      appendToList(file, current, current.getProperties(), `${f.key}: ${defaultValue(f, responseKeys.has(f.key) ? param : undefined)}`);
      report.added.push(`defaultValues: ${f.key}`);
    }
    for (const key of present) {
      if (bodyKeys.has(key)) {
        continue;
      }
      if (!prune) {
        report.stale.push(`defaultValues: ${key}`);
        continue;
      }
      const current = freshDefaults(file, s.camel);
      const prop = current.getProperties().find((p) => (Node.isPropertyAssignment(p) || Node.isShorthandPropertyAssignment(p)) && p.getName() === key);
      if (prop) {
        removeListElement(file, current.getProperties(), prop);
      }
      report.removed!.push(`defaultValues: ${key}`);
    }
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

/** The translated options of an enum field, made at the top of the form. */
const optionsVar = (f: FormField) => `${casings(words(f.key)).camel}Options`;

/** The icon in the input's addon (text, select and number inputs). */
const ADDON_ICONS: Partial<Record<FormField['kind'], string>> = {
  enum: 'TagIcon',
  number: 'HashIcon',
  decimal: 'HashIcon',
  id: 'LinkIcon',
  email: 'MailIcon',
};

/**
 * The JSX of a new field, and the lucide icon it uses; `ns` is the
 * resource's messages (`invoices`).
 */
function fieldJsx(f: FormField, ns: string): { code: string; icon?: string } {
  const label = `label={t("${ns}.fields.${f.key}")}`;
  // An input with its icon in an addon, e.g. <field.TextField …><InputGroupAddon>…
  const withAddon = (component: string, props: string[], icon: string) => ({
    code: `<${component}\n  ${[label, ...props].join('\n  ')}\n>\n  <InputGroupAddon>\n    <${icon} />\n  </InputGroupAddon>\n</${component}>`,
    icon,
  });
  const plain = (component: string, props: string[] = []): { code: string; icon?: string } => ({ code: `<${component} ${[label, ...props].join(' ')} />` });
  const field = (() => {
    const icon = ADDON_ICONS[f.kind] ?? 'TextIcon';
    switch (f.kind) {
      case 'enum':
        return withAddon('field.SelectField', [`options={${optionsVar(f)}}`], icon);
      case 'boolean':
        return plain('field.CheckboxField');
      case 'number':
        return withAddon('field.NumberField', [], icon);
      case 'decimal':
        return withAddon('field.TextField', ['inputMode="decimal"', 'autoComplete="off"'], icon);
      case 'id':
        return withAddon('field.TextField', ['inputMode="numeric"', 'autoComplete="off"'], icon);
      case 'email':
        return withAddon('field.TextField', ['type="email"', 'autoComplete="off"'], icon);
      case 'date':
        return plain('field.DatePickerField');
      case 'datetime':
        return { code: `<field.DateTimePickerField ${label} icon={CalendarClockIcon} />`, icon: 'CalendarClockIcon' };
      // Long text: the whole row of the section's grid.
      case 'textarea':
        return plain('field.TextareaField', ['className="col-span-full"']);
      case 'editor':
        return plain('field.TextEditorField', ['className="col-span-full"']);
      default:
        return withAddon('field.TextField', ['autoComplete="off"'], icon);
    }
  })();
  const body = field.code.includes('\n') ? `(\n    ${field.code.replace(/\n/g, '\n    ')}\n  )` : field.code;
  return { code: `<form.AppField name="${f.key}">\n  {(field) => ${body}}\n</form.AppField>`, icon: field.icon };
}

/** The section the fields go in: "Details" (`<plural>.sections.details`), else the first. */
function fieldsSection(file: SourceFile) {
  const sections = file
    .getDescendantsOfKind(SyntaxKind.JsxElement)
    .filter((e) => e.getOpeningElement().getTagNameNode().getText() === 'DetailSection');
  return sections.find((e) => /\.sections\.details"/.test(e.getOpeningElement().getAttribute('title')?.getText() ?? '')) ?? sections[0];
}

/**
 * The form component: a <form.AppField> for each body field that has none,
 * after the last one, unless a `{/* dafne-ignore: key *\/}` comment says
 * the field has no input on purpose.
 */
export function syncFormComponent(
  path: string,
  source: string,
  fields: FormField[],
  names: ResourceNames,
  { prune = false, refs = pageRefs(names) }: { prune?: boolean; refs?: PageRefs } = {},
): { content: string; report: FormReport } {
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
      if (!Node.isJsxElement(e)) {
        return undefined;
      }
      const attr = e.getOpeningElement().getAttribute('name');
      const init = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
      return init && Node.isStringLiteral(init) ? init.getLiteralValue() : undefined;
    };
    const present = new Set(appFields().map(nameOf).filter(Boolean) as string[]);
    const missing = fields.filter((f) => !present.has(f.key) && !ignored.has(f.key));

    const body = new Set(fields.map((f) => f.key));
    for (const name of present) {
      if (body.has(name) || /[[.]/.test(name)) {
        continue;
      }
      if (!prune) {
        report.stale.push(`<form.AppField name="${name}">`);
        continue;
      }
      // Looked up again after each removal: editing the text forgets the old nodes.
      const next = () => appFields().find((e) => nameOf(e) === name);
      for (let element = next(); element; element = next()) {
        removeJsxElement(file, element);
      }
      report.removed!.push(`<form.AppField name="${name}">`);
    }
    for (const f of missing.filter((f) => f.kind === 'unsupported')) {
      report.warnings.push(`${f.key}: no input for this kind of field; add it by hand, or mark it {/* dafne-ignore: ${f.key} */}.`);
    }

    for (const f of missing.filter((f) => f.kind !== 'unsupported')) {
      const topLevel = appFields().filter((e) => !e.getAncestors().some((a) => Node.isJsxElement(a) && a.getOpeningElement().getTagNameNode().getText() === 'form.AppField'));
      const last = topLevel[topLevel.length - 1];
      const text = file.getFullText();
      const indentOf = (pos: number) => /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', pos - 1) + 1))![0];
      const { code, icon } = fieldJsx(f, names.p.camel);
      if (last) {
        const indent = indentOf(last.getStart());
        file.insertText(last.getEnd(), `\n${indent}${code.replace(/\n/g, `\n${indent}`)}`);
      } else {
        // A form with no field yet: last in its "Details" section, or in an
        // older form's grid (the first <div className="grid …">).
        const container =
          fieldsSection(file) ??
          file
            .getDescendantsOfKind(SyntaxKind.JsxElement)
            .find((e) => e.getOpeningElement().getTagNameNode().getText() === 'div' && /^"grid\b/.test(e.getOpeningElement().getAttribute('className')?.getText().replace(/^className=/, '') ?? ''));
        if (!container) {
          report.warnings.push(`${path}: no <form.AppField> to put ${f.key} next to; add it by hand.`);
          continue;
        }
        const indent = indentOf(container.getStart());
        const closing = container.getClosingElement();
        // After what's there (e.g. the template's comment), on lines of its own.
        const before = text.slice(0, closing.getStart()).replace(/[ \t]*$/, '');
        const start = before.length;
        file.replaceText([start, closing.getStart()], `${before.endsWith('\n') ? '' : '\n'}${indent}  ${code.replace(/\n/g, `\n${indent}  `)}\n${indent}`);
      }
      if (icon) {
        ensureNamedImport(file, 'lucide-react', icon);
      }
      if (code.includes('<InputGroupAddon>')) {
        ensureNamedImport(file, '@dafne/frontend-ui/components/input-group', 'InputGroupAddon');
      }
      if (f.kind === 'enum') {
        ensureNamedImport(file, refs.schema, optionsName(f));
        if (ensureHookLine(file, `const ${optionsVar(f)} = useOptionLabels(${optionsName(f)});`)) {
          ensureNamedImport(file, '@dafne/frontend-ui/hooks/use-option-labels', 'useOptionLabels');
        }
      }
      report.added.push(`<form.AppField name="${f.key}">`);
    }
  });
  return { content, report };
}

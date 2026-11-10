import { Node, type ObjectLiteralExpression, type SourceFile, SyntaxKind } from 'ts-morph';
import { pageRefs, type PageRefs } from '../core/frontend-target.ts';
import type { ResourceNames } from '../core/names.ts';
import { appendToList, editSource, ensureHookLine, ensureNamedImport, insertImportLine, insertListElement, removeListElement, removeUnusedImports } from '../wiring/ast.ts';
import { fallbackSort } from './dropped.ts';
import { CONTRACTS_PACKAGE } from '../wiring/backend.ts';
import type { FormReport as Report } from './form.ts';
import { enumOptionsName, ignoredKeys, optionLabel, type ResponseField, type ResponseInfo } from './response.ts';

/*
 * `sync frontend table`: adds what the contract has and the table lacks, in
 * lib/<plural>-table.ts (sort fields, filters, enum labels) and in
 * app/[locale]/(app)/<plural>/<plural>-table.tsx (columns), or in a lib's
 * <plural>-table.ts (define<Plural>Table) and components/<plural>-table.tsx. Nothing that's there
 * changes, unless `prune`: then what the contract dropped goes too (and a
 * default sort on a dropped field moves to createdAt). Labels are message keys (`<plural>.fields.<key>`), whose texts
 * syncMessages adds to the catalogs.
 */

const newReport = (): Report => ({ added: [], removed: [], stale: [], warnings: [] });

/** Never added as columns: the update date is on the detail page. */
const NO_COLUMN = new Set(['updatedAt']);

/** The id column: first, and the link to the detail page (no field names the record). */
const idColumn = (names: ResourceNames, key: (k: string) => string, link: string) =>
  `col.accessor("id", {
    header: t("${key(`${names.p.camel}.fields.id`)}"),
    cell: ({ row }) => (
      <Link
        href={\`${link}/\${encodeURIComponent(row.original.id)}\`}
        className="font-medium underline-offset-4 hover:underline"
      >
        {row.original.id}
      </Link>
    ),
  })`;

/** The `{ value, label }` list of an enum, shared by filters, columns and the detail page; labels are message keys. */
export function ensureEnumOptions(file: SourceFile, names: ResourceNames, field: ResponseField, report: Report, refs = pageRefs(names)) {
  const name = enumOptionsName(names, field);
  if (file.getVariableDeclaration(name)) return;
  const options = field.values!.map((v) => `{ value: "${v}", label: "${names.p.camel}.${field.key}.${v}" }`).join(',\n  ');
  const { name: keyType, module } = refs.messageKey;
  const anchor = tableAnchor(file, names);
  file.insertText(
    anchor ? anchor.getStart(true) : file.getEnd(),
    `/** Labels (message keys) of the ${field.label.toLowerCase()} values. */\nexport const ${name} = [\n  ${options},\n] satisfies { value: ${field.enumType}; label: ${keyType} }[];\n\n`,
  );
  ensureNamedImport(file, CONTRACTS_PACKAGE, field.enumType!, { typeOnly: true });
  ensureNamedImport(file, module, keyType, { typeOnly: true });
  report.added.push(name);
}

/** What the enum labels go before: the app's `<plural>Table`, or a lib's default sort or define<Plural>Table. */
function tableAnchor(file: SourceFile, { p }: ResourceNames): Node | undefined {
  return (
    file.getVariableStatement(`${p.camel}Table`) ??
    file.getVariableStatement(`${p.constant}_DEFAULT_SORT`) ??
    file.getFunction(`define${p.pascal}Table`)
  );
}

/**
 * The enum labels other pages use (the detail page), in lib/<plural>-table.ts,
 * for a resource without a table page: `sync frontend table` would add them otherwise.
 */
export function syncEnumOptions(path: string, source: string, names: ResourceNames, fields: ResponseField[], refs = pageRefs(names)): { content: string; report: Report } {
  const report = newReport();
  for (const field of fields)
    source = editSource(path, source, (file) => ensureEnumOptions(file, names, field, report, refs));
  return { content: source, report };
}

/** The object passed to defineDataTable({...}): in `<plural>Table` (the app) or in define<Plural>Table (a lib). */
function tableConfig(file: SourceFile, { p }: ResourceNames): ObjectLiteralExpression | undefined {
  const holder = file.getVariableDeclaration(`${p.camel}Table`) ?? file.getFunction(`define${p.pascal}Table`);
  const call = holder?.getDescendantsOfKind(SyntaxKind.CallExpression).find((c) => c.getExpression().getText() === 'defineDataTable');
  return call?.getArguments()[0]?.asKind(SyntaxKind.ObjectLiteralExpression) ?? holder?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
}

function arrayOf(config: ObjectLiteralExpression, property: string) {
  const prop = config.getProperty(property);
  return prop && Node.isPropertyAssignment(prop)
    ? prop.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression) ??
        prop.getInitializer()?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression)
    : undefined;
}

export function syncTableConfig(
  path: string,
  source: string,
  names: ResourceNames,
  info: ResponseInfo,
  { prune = false, refs = pageRefs(names) }: { prune?: boolean; refs?: PageRefs } = {},
): { content: string; report: Report } {
  const report = newReport();
  const { s, p } = names;
  // Named in the warnings.
  const variable = refs.kind === 'app' ? `${p.camel}Table` : `define${p.pascal}Table`;
  const configOf = (file: SourceFile) => tableConfig(file, names);
  // A lib's labels are checked against its own keys.
  const keyType = refs.kind === 'lib' ? refs.messageKey : undefined;
  const ignored = ignoredKeys(source);
  const byKey = new Map(info.fields.map((f) => [f.key, f]));
  const step = (edit: (file: SourceFile) => void) => {
    source = editSource(path, source, edit);
  };

  // Enum labels used by the filters, the columns and the detail page.
  for (const field of info.fields.filter((f) => f.kind === 'enum' && !ignored.has(f.key)))
    step((file) => ensureEnumOptions(file, names, field, report, refs));

  step((file) => {
    const config = configOf(file);
    const sortable = config && arrayOf(config, 'sortable');
    if (!sortable) return void report.warnings.push(`${path}: no ${variable}.sortable list.`);
    const present = sortable.getElements().filter(Node.isStringLiteral).map((e) => e.getLiteralValue());
    for (const key of present) {
      if (info.sortFields.includes(key)) continue;
      if (!prune) {
        report.stale.push(`sortable: ${key}`);
        continue;
      }
      const elements = arrayOf(configOf(file)!, 'sortable')!.getElements();
      const element = elements.find((e) => Node.isStringLiteral(e) && e.getLiteralValue() === key);
      if (element) removeListElement(file, elements, element);
      report.removed!.push(`sortable: ${key}`);
    }
    for (const key of info.sortFields.filter((k) => !present.includes(k) && !ignored.has(k))) {
      const fresh = arrayOf(configOf(file)!, 'sortable')!;
      const elements = fresh.getElements();
      const keys = elements.map((e) => (Node.isStringLiteral(e) ? e.getLiteralValue() : ''));
      // After the field that comes before it in the contract, if it's there.
      const before = info.sortFields.slice(0, info.sortFields.indexOf(key)).reverse().find((k) => keys.includes(k));
      const at = before === undefined ? (keys.length ? 0 : -1) : keys.indexOf(before) + 1;
      if (at === -1 || at >= elements.length) appendToList(file, fresh, elements, `"${key}"`);
      else if (at === 0) file.insertText(elements[0].getStart(), `"${key}", `);
      else insertListElement(file, elements, at, `"${key}"`);
      report.added.push(`sortable: ${key}`);
    }
  });

  step((file) => {
    const config = configOf(file);
    const filters = config && arrayOf(config, 'filters');
    if (!filters) return void report.warnings.push(`${path}: no ${variable}.filters list.`);
    const fieldOf = (e: Node) => {
      const prop = Node.isObjectLiteralExpression(e) ? e.getProperty('field') : undefined;
      return prop && Node.isPropertyAssignment(prop)
        ? prop.getInitializer()?.getFirstDescendantByKind(SyntaxKind.StringLiteral)?.getLiteralValue() ??
            (prop.getInitializer() && Node.isStringLiteral(prop.getInitializer()!) ? prop.getInitializerOrThrow().getText().slice(1, -1) : undefined)
        : undefined;
    };
    const present = filters.getElements().map(fieldOf).filter(Boolean) as string[];
    for (const key of present) {
      if (info.filterFields.includes(key)) continue;
      if (!prune) {
        report.stale.push(`filters: ${key}`);
        continue;
      }
      const elements = arrayOf(configOf(file)!, 'filters')!.getElements();
      const element = elements.find((e) => fieldOf(e) === key);
      if (element) removeListElement(file, elements, element);
      report.removed!.push(`filters: ${key}`);
    }
    for (const key of info.filterFields.filter((k) => !present.includes(k) && !ignored.has(k))) {
      const field = byKey.get(key);
      // A message key; the filter shows "Any <label>" when empty.
      const label = `"${names.p.camel}.fields.${key}"${keyType ? ` satisfies ${keyType.name}` : ''}`;
      const parts = [`field: "${key}" satisfies ${s.pascal}FilterField`, `label: ${label}`];
      if (field?.kind === 'enum') parts.push(`options: ${enumOptionsName(names, field)}`);
      if (field?.kind === 'boolean')
        parts.push(`options: [{ value: "true", label: "common.yes" }, { value: "false", label: "common.no" }]`);
      const fresh = arrayOf(configOf(file)!, 'filters')!;
      appendToList(file, fresh, fresh.getElements(), `{ ${parts.join(', ')} }`);
      report.added.push(`filters: ${key}`);
    }
    if (report.added.some((a) => a.startsWith('filters:'))) {
      ensureNamedImport(file, CONTRACTS_PACKAGE, `${s.pascal}FilterField`, { typeOnly: true });
      if (keyType) ensureNamedImport(file, keyType.module, keyType.name, { typeOnly: true });
    }
  });

  // defaultSort: { id: "name", … } on a field the contract can't sort by any more.
  if (prune)
    step((file) => {
      const prop = configOf(file)?.getProperty('defaultSort');
      let init = prop && Node.isPropertyAssignment(prop) ? prop.getInitializer() : undefined;
      // A lib's `defaultSort: <PLURAL>_DEFAULT_SORT`: the constant's object.
      if (init && Node.isIdentifier(init)) init = file.getVariableDeclaration(init.getText())?.getInitializer();
      const object = init?.asKind(SyntaxKind.ObjectLiteralExpression);
      const id = object?.getProperty('id');
      const value = id && Node.isPropertyAssignment(id) ? id.getInitializer() : undefined;
      if (!value || !Node.isStringLiteral(value) || info.sortFields.includes(value.getLiteralValue())) return;
      const sort = fallbackSort(info.sortFields);
      if (!sort) return void report.warnings.push(`${path}: defaultSort is on ${value.getLiteralValue()}, which can't be sorted by any more: fix it by hand.`);
      report.removed!.push(`defaultSort: ${value.getLiteralValue()} (now ${sort})`);
      value.replaceWithText(`"${sort}"`);
    });

  return { content: source, report };
}

/** The cell of a column, by kind. */
function columnCode(
  names: ResourceNames,
  field: ResponseField,
  sortable: boolean,
  key: (k: string) => string,
  refs: PageRefs,
): { code: string; imports: [string, string][] } {
  const imports: [string, string][] = [];
  const options: string[] = [`header: t("${key(`${names.p.camel}.fields.${field.key}`)}")`];
  if (field.kind === 'number') options.push('meta: { className: "text-right" }');
  if (!sortable) options.push('enableSorting: false');
  const dash = '"—"';
  switch (field.kind) {
    case 'boolean':
      options.push(
        field.optional
          ? `cell: (info) => (info.getValue() === null ? ${dash} : t(info.getValue() ? "${key('common.yes')}" : "${key('common.no')}"))`
          : `cell: (info) => t(info.getValue() ? "${key('common.yes')}" : "${key('common.no')}")`,
      );
      break;
    case 'enum': {
      const name = enumOptionsName(names, field);
      imports.push([refs.table, name]);
      options.push(`cell: (info) => optionLabel(${name}, info.getValue())`);
      break;
    }
    case 'date':
    case 'datetime': {
      imports.push(['@dafne/frontend-ui/components/local-date', 'LocalDate']);
      const format = field.kind === 'date' ? 'date' : 'dateTime';
      options.push(
        field.optional
          ? `cell: (info) => {\n const value = info.getValue();\n return value ? <LocalDate value={value} format="${format}" /> : ${dash};\n }`
          : `cell: (info) => <LocalDate value={info.getValue()} format="${format}" />`,
      );
      break;
    }
    default:
      if (field.optional) options.push(`cell: (info) => info.getValue() ?? ${dash}`);
  }
  return { code: `col.accessor("${field.key}", { ${options.join(', ')} })`, imports };
}

/**
 * The namespace of `useTranslations("…")` in the function that builds the
 * columns (none for `useTranslations()`): `t` takes keys relative to it.
 */
function columnsNamespace(columns: Node): string | undefined {
  // The nearest enclosing function that calls it (the useMemo callback doesn't).
  for (const fn of columns.getAncestors()) {
    if (!Node.isFunctionDeclaration(fn) && !Node.isArrowFunction(fn) && !Node.isFunctionExpression(fn)) continue;
    const hook = fn.getDescendantsOfKind(SyntaxKind.CallExpression).find((c) => c.getExpression().getText() === 'useTranslations');
    if (!hook) continue;
    const arg = hook.getArguments()[0];
    return arg && Node.isStringLiteral(arg) ? arg.getLiteralValue() : undefined;
  }
  return undefined;
}

export function syncColumns(
  path: string,
  source: string,
  names: ResourceNames,
  info: ResponseInfo,
  { prune = false, refs = pageRefs(names) }: { prune?: boolean; refs?: PageRefs } = {},
): { content: string; report: Report } {
  const report = newReport();
  const ignored = ignoredKeys(source);
  const columnsArray = (file: SourceFile) =>
    file
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((c) => c.getExpression().getText() === 'col.columns')
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.ArrayLiteralExpression);
  const keyOf = (e: Node) => {
    if (!Node.isCallExpression(e) || e.getExpression().getText() !== 'col.accessor') return undefined;
    const first = e.getArguments()[0];
    return first && Node.isStringLiteral(first) ? first.getLiteralValue() : undefined;
  };

  const content = editSource(path, source, (file) => {
    const array = columnsArray(file);
    if (!array) return void report.warnings.push(`${path}: no col.columns([...]).`);
    // A key as `t` takes it; one outside its namespace stays whole, with a warning.
    const ns = columnsNamespace(array);
    const key = (k: string) => {
      if (!ns) return k;
      if (k.startsWith(`${ns}.`)) return k.slice(ns.length + 1);
      report.warnings.push(`${path}: ${k} is outside useTranslations("${ns}"): fix its t() call by hand.`);
      return k;
    };
    const present = array.getElements().map(keyOf).filter(Boolean) as string[];
    const listed = new Set(info.fields.filter((f) => f.listed).map((f) => f.key));
    for (const key of present) {
      if (listed.has(key)) continue;
      if (!prune) {
        report.stale.push(`column ${key}`);
        continue;
      }
      const elements = columnsArray(file)!.getElements();
      const element = elements.find((e) => keyOf(e) === key);
      if (!element) continue;
      // The generated lists link to the detail page from the first column.
      if (/<Link\b/.test(element.getText()))
        report.warnings.push(`${path}: the ${key} column linked to the detail page: link another column to it.`);
      removeListElement(file, elements, element);
      report.removed!.push(`column ${key}`);
    }
    // Imports only the removed cells used (Link, LocalDate, enum labels…).
    if (report.removed!.length)
      removeUnusedImports(file, (m) => ['next/link', 'lucide-react', refs.table].includes(m) || m.startsWith('@dafne/frontend-ui/') || m.startsWith('@/lib/'));

    // The id, listed unless its @api tags say otherwise (detail, internal…): the first column.
    if (listed.has('id') && !present.includes('id') && !ignored.has('id')) {
      const fresh = columnsArray(file)!;
      const elements = fresh.getElements();
      if (elements.length) file.insertText(elements[0].getStart(), `${idColumn(names, key, refs.link)},\n  `);
      else appendToList(file, fresh, elements, idColumn(names, key, refs.link));
      if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === 'next/link')) insertImportLine(file, 'Link', 'next/link');
      report.added.push('column id');
    }
    // Without the id the rows can't link to their page, nor have actions.
    if (!listed.has('id') && /\.id\b/.test(file.getFullText()))
      report.warnings.push(`${path}: Listed${names.s.pascal} has no id (its @api tags): the row ids, links and actions read it; remove them or list the id.`);

    for (const field of info.fields.filter((f) => f.listed && f.key !== 'id' && !present.includes(f.key) && !ignored.has(f.key) && !NO_COLUMN.has(f.key))) {
      if (field.kind === 'id') {
        report.warnings.push(`${field.key}: an id, not added as a column; show the related record by hand, or mark it dafne-ignore.`);
        continue;
      }
      const { code, imports } = columnCode(names, field, info.sortFields.includes(field.key), key, refs);
      const fresh = columnsArray(file)!;
      const elements = fresh.getElements();
      // Before "Added" (createdAt), which the generated lists keep last.
      const at = elements.findIndex((e) => keyOf(e) === 'createdAt');
      if (at > 0) insertListElement(file, elements, at, code);
      else if (at === 0) file.insertText(elements[0].getStart(), `${code},\n  `);
      else appendToList(file, fresh, elements, code);
      for (const [module, name] of imports) ensureNamedImport(file, module, name);
      if (field.kind === 'enum' && ensureHookLine(file, 'const optionLabel = useOptionLabel();'))
        ensureNamedImport(file, '@dafne/frontend-ui/hooks/use-option-labels', 'useOptionLabel');
      report.added.push(`column ${field.key}`);
    }
  });
  return { content, report };
}

import { Node, type ObjectLiteralExpression, type SourceFile, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.js';
import { appendToList, editSource, ensureNamedImport, insertListElement } from '../wiring/ast.js';
import type { FormReport as Report } from './form.js';
import { enumOptionsName, ignoredKeys, optionLabel, type ResponseField, type ResponseInfo } from './response.js';

/*
 * `sync frontend table`: adds what the contract has and the table lacks, in
 * lib/<plural>-table.ts (sort fields, filters, enum labels) and in
 * app/(app)/<plural>/columns.tsx (columns). Nothing that's there changes.
 */

const newReport = (): Report => ({ added: [], stale: [], warnings: [] });

/** Never added as columns: the id is in the link, the update date on the detail page. */
const NO_COLUMN = new Set(['id', 'updatedAt']);

/** The `{ value, label }` list of an enum, shared by filters, columns and the detail page. */
export function ensureEnumOptions(file: SourceFile, names: ResourceNames, field: ResponseField, before: string, report: Report) {
  const name = enumOptionsName(names, field);
  if (file.getVariableDeclaration(name)) return;
  const options = field.values!.map((v) => `{ value: "${v}", label: "${optionLabel(v)}" }`).join(',\n  ');
  const statement = file.getVariableStatement(before);
  file.insertText(
    statement ? statement.getStart(true) : file.getEnd(),
    `/** Labels of the ${field.label.toLowerCase()} values. */\nexport const ${name} = [\n  ${options},\n] satisfies { value: ${field.enumType}; label: string }[];\n\n`,
  );
  ensureNamedImport(file, '@backend/contracts', field.enumType!, { typeOnly: true });
  report.added.push(name);
}

/**
 * The enum labels other pages use (the detail page), in lib/<plural>-table.ts,
 * for a resource without a table page: `sync frontend table` would add them otherwise.
 */
export function syncEnumOptions(path: string, source: string, names: ResourceNames, fields: ResponseField[]): { content: string; report: Report } {
  const report = newReport();
  for (const field of fields)
    source = editSource(path, source, (file) => ensureEnumOptions(file, names, field, `${names.p.camel}Table`, report));
  return { content: source, report };
}

/** The object passed to defineDataTable({...}). */
function tableConfig(file: SourceFile, variable: string): ObjectLiteralExpression | undefined {
  return file.getVariableDeclaration(variable)?.getFirstDescendantByKind(SyntaxKind.ObjectLiteralExpression);
}

function arrayOf(config: ObjectLiteralExpression, property: string) {
  const prop = config.getProperty(property);
  return prop && Node.isPropertyAssignment(prop)
    ? prop.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression) ??
        prop.getInitializer()?.getFirstDescendantByKind(SyntaxKind.ArrayLiteralExpression)
    : undefined;
}

export function syncTableConfig(path: string, source: string, names: ResourceNames, info: ResponseInfo): { content: string; report: Report } {
  const report = newReport();
  const { s, p } = names;
  const variable = `${p.camel}Table`;
  const ignored = ignoredKeys(source);
  const byKey = new Map(info.fields.map((f) => [f.key, f]));
  const step = (edit: (file: SourceFile) => void) => {
    source = editSource(path, source, edit);
  };

  // Enum labels used by the filters, the columns and the detail page.
  for (const field of info.fields.filter((f) => f.kind === 'enum' && !ignored.has(f.key)))
    step((file) => ensureEnumOptions(file, names, field, variable, report));

  step((file) => {
    const config = tableConfig(file, variable);
    const sortable = config && arrayOf(config, 'sortable');
    if (!sortable) return void report.warnings.push(`${path}: no ${variable}.sortable list.`);
    const present = sortable.getElements().filter(Node.isStringLiteral).map((e) => e.getLiteralValue());
    for (const key of present) if (!info.sortFields.includes(key)) report.stale.push(`sortable: ${key}`);
    for (const key of info.sortFields.filter((k) => !present.includes(k) && !ignored.has(k))) {
      const fresh = arrayOf(tableConfig(file, variable)!, 'sortable')!;
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
    const config = tableConfig(file, variable);
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
    for (const key of present) if (!info.filterFields.includes(key)) report.stale.push(`filters: ${key}`);
    for (const key of info.filterFields.filter((k) => !present.includes(k) && !ignored.has(k))) {
      const field = byKey.get(key);
      const label = field?.label ?? key;
      const parts = [`field: "${key}" satisfies ${s.pascal}FilterField`, `label: "${label}"`];
      if (field?.kind === 'enum') parts.push(`placeholder: "Any ${label.toLowerCase()}"`, `options: ${enumOptionsName(names, field)}`);
      if (field?.kind === 'boolean')
        parts.push(`placeholder: "Any"`, `options: [{ value: "true", label: "Yes" }, { value: "false", label: "No" }]`);
      const fresh = arrayOf(tableConfig(file, variable)!, 'filters')!;
      appendToList(file, fresh, fresh.getElements(), `{ ${parts.join(', ')} }`);
      report.added.push(`filters: ${key}`);
    }
    if (report.added.some((a) => a.startsWith('filters:')))
      ensureNamedImport(file, '@backend/contracts', `${s.pascal}FilterField`, { typeOnly: true });
  });

  return { content: source, report };
}

/** The cell of a column, by kind. */
function columnCode(names: ResourceNames, field: ResponseField, sortable: boolean): { code: string; imports: [string, string][] } {
  const imports: [string, string][] = [];
  const options: string[] = [`header: "${field.label}"`];
  if (field.kind === 'number') options.push('meta: { className: "text-right" }');
  if (!sortable) options.push('enableSorting: false');
  const dash = '"—"';
  switch (field.kind) {
    case 'boolean':
      options.push(
        field.optional
          ? `cell: (info) => (info.getValue() === null ? ${dash} : info.getValue() ? "Yes" : "No")`
          : `cell: (info) => (info.getValue() ? "Yes" : "No")`,
      );
      break;
    case 'enum': {
      const name = enumOptionsName(names, field);
      imports.push([`@/lib/${names.p.kebab}-table`, name]);
      options.push(`cell: (info) => ${name}.find((o) => o.value === info.getValue())?.label ?? ${dash}`);
      break;
    }
    case 'date':
    case 'datetime': {
      imports.push(['@/components/local-date', 'LocalDate']);
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

export function syncColumns(path: string, source: string, names: ResourceNames, info: ResponseInfo): { content: string; report: Report } {
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
    const present = array.getElements().map(keyOf).filter(Boolean) as string[];
    const listed = new Set(info.fields.filter((f) => f.listed).map((f) => f.key));
    for (const key of present) if (!listed.has(key)) report.stale.push(`column ${key}`);

    for (const field of info.fields.filter((f) => f.listed && !present.includes(f.key) && !ignored.has(f.key) && !NO_COLUMN.has(f.key))) {
      if (field.kind === 'id') {
        report.warnings.push(`${field.key}: an id, not added as a column; show the related record by hand, or mark it dafne-ignore.`);
        continue;
      }
      const { code, imports } = columnCode(names, field, info.sortFields.includes(field.key));
      const fresh = columnsArray(file)!;
      const elements = fresh.getElements();
      // Before "Added" (createdAt), which the generated lists keep last.
      const at = elements.findIndex((e) => keyOf(e) === 'createdAt');
      if (at > 0) insertListElement(file, elements, at, code);
      else if (at === 0) file.insertText(elements[0].getStart(), `${code},\n  `);
      else appendToList(file, fresh, elements, code);
      for (const [module, name] of imports) ensureNamedImport(file, module, name);
      report.added.push(`column ${field.key}`);
    }
  });
  return { content, report };
}

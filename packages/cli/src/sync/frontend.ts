import type { Changes } from '../core/changes.ts';
import type { ResourceNames } from '../core/names.ts';
import { frontendApp } from '../core/workspace.ts';
import { contractFile, tableFile } from '../pieces/backend.ts';
import { editSource } from '../wiring/ast.ts';
import { readBody } from './body.ts';
import { syncDetail } from './detail.ts';
import { syncFormComponent, syncFormSchema, type FormReport } from './form.ts';
import { enumOptionsName, readResponse } from './response.ts';
import { syncColumns, syncEnumOptions, syncTableConfig } from './table-page.ts';
import { readTable } from './table.ts';

/*
 * Brings a resource's pages in line with its contract: the form gets the
 * body's fields, the list and the detail the response's. They only add what
 * is missing; what the contract no longer has is kept and reported.
 */

export type FrontendReports = [path: string, report: FormReport][];

/** The folder of a resource's pages, e.g. apps/sales-web/app/[locale]/(app)/invoices. */
export const routeDir = ({ p }: ResourceNames, app: string) => `${frontendApp(app)}/app/[locale]/(app)/${p.kebab}`;
/** lib/<plural>.ts (API types and fetchers) and lib/<plural>-table.ts (table config, enum labels). */
export const dataFiles = ({ p }: ResourceNames, app: string) => ({
  lib: `${frontendApp(app)}/lib/${p.kebab}.ts`,
  table: `${frontendApp(app)}/lib/${p.kebab}-table.ts`,
});
export const formFiles = (names: ResourceNames, app: string) => ({
  schema: `${routeDir(names, app)}/schema.ts`,
  form: `${routeDir(names, app)}/${names.s.kebab}-form.tsx`,
});
export const listFiles = (names: ResourceNames, app: string) => ({
  page: `${routeDir(names, app)}/page.tsx`,
  columns: `${routeDir(names, app)}/${names.p.kebab}-table.tsx`,
});
export const detailFiles = (names: ResourceNames, app: string) => ({
  component: `${routeDir(names, app)}/${names.s.kebab}-detail.tsx`,
  page: `${routeDir(names, app)}/[id]/page.tsx`,
});

/** The contract and the table of a resource, or undefined without a contract. */
function contractOf(changes: Changes, names: ResourceNames) {
  const contractPath = contractFile(names);
  const contract = changes.read(contractPath);
  if (contract === undefined) return undefined;
  const tablePath = tableFile(names);
  const tableSource = changes.read(tablePath);
  const table = tableSource === undefined ? undefined : readTable(tablePath, tableSource, names);
  return { contractPath, contract, table };
}

function apply(
  changes: Changes,
  path: string,
  sync: (source: string) => { content: string; report: FormReport },
): [string, FormReport] {
  const source = changes.read(path);
  if (source === undefined) throw new Error(`${path} not found.`);
  const { content, report } = sync(source);
  changes.update(path, () => content, { format: true });
  return [path, report];
}

/** The list page: table config (filters, sort, enum labels) and columns. */
export function syncList(changes: Changes, names: ResourceNames, app: string): FrontendReports {
  const source = contractOf(changes, names);
  if (!source) return [];
  const info = readResponse(source.contractPath, source.contract, names, source.table);
  const { table } = dataFiles(names, app);
  const { columns } = listFiles(names, app);
  return [
    apply(changes, table, (text) => syncTableConfig(table, text, names, info)),
    apply(changes, columns, (text) => syncColumns(columns, text, names, info)),
  ];
}

/** The detail component, and the enum labels it reads in lib/<plural>-table.ts. */
export function syncDetailPage(changes: Changes, names: ResourceNames, app: string): FrontendReports {
  const source = contractOf(changes, names);
  if (!source) return [];
  const info = readResponse(source.contractPath, source.contract, names, source.table);
  const { component, page } = detailFiles(names, app);
  // The page shows the title and the actions: what it reads counts too.
  const pageSource = changes.read(page);
  const reports = [
    apply(changes, component, (text) => syncDetail(component, text, names, info, pageSource ? [pageSource] : [])),
  ];
  const detail = changes.read(component)!;
  const used = info.fields.filter((f) => f.kind === 'enum' && detail.includes(enumOptionsName(names, f)));
  const { table } = dataFiles(names, app);
  if (used.length && changes.exists(table))
    reports.push(apply(changes, table, (text) => syncEnumOptions(table, text, names, used)));
  return reports;
}

/** The form: the values, defaults and options in schema.ts, the inputs in <singular>-form.tsx. */
export function syncForm(changes: Changes, names: ResourceNames, app: string): FrontendReports {
  const source = contractOf(changes, names);
  if (!source) return [];
  const fields = readBody(source.contractPath, source.contract, names, source.table);
  const responseKeys = responseFields(source.contractPath, source.contract, names);
  const files = formFiles(names, app);
  return [
    apply(changes, files.schema, (text) => syncFormSchema(files.schema, text, names, fields, responseKeys)),
    apply(changes, files.form, (text) => syncFormComponent(files.form, text, fields, names)),
  ];
}

/** Fields of Listed<S> and <S>Detail: what the form can read back when editing. */
function responseFields(path: string, contract: string, names: ResourceNames): Set<string> {
  const keys = new Set<string>();
  editSource(path, contract, (file) => {
    for (const name of [`Listed${names.s.pascal}`, `${names.s.pascal}Detail`])
      for (const prop of file.getInterface(name)?.getProperties() ?? []) keys.add(prop.getName());
  });
  return keys;
}

/** Turns the reports into warnings of the change set (what was added is in the files). */
export function warnReports(changes: Changes, reports: FrontendReports) {
  for (const [file, report] of reports) {
    for (const item of report.stale)
      changes.warn(`${file}: ${item} isn't in the contract any more: kept. Remove it if the field was dropped.`);
    for (const warning of report.warnings) changes.warn(warning);
  }
}

import type { Changes } from '../core/changes.ts';
import type { ResourceNames } from '../core/names.ts';
import {
  dataFiles,
  detailFiles,
  formFiles,
  listFiles,
  pageRefs,
  routeDir,
  toTarget,
  type FrontendTarget,
} from '../core/frontend-target.ts';
import { contractFile, tableFile } from '../pieces/backend.ts';
import { CONTRACTS_PACKAGE } from '../wiring/backend.ts';
import { editSource, removeUnusedImports } from '../wiring/ast.ts';
import { SyntaxKind } from 'ts-morph';
import { readBody } from './body.ts';
import { syncDetail } from './detail.ts';
import { syncFormComponent, syncFormSchema, type FormReport } from './form.ts';
import { enumOptionsName, readResponse } from './response.ts';
import { syncColumns, syncEnumOptions, syncTableConfig } from './table-page.ts';
import { readTable } from './table.ts';

/*
 * Brings a resource's pages in line with its contract: the form gets the
 * body's fields, the list and the detail the response's. They add what is
 * missing; what the contract no longer has is kept and reported, or, with
 * `prune`, removed.
 */

export type FrontendReports = [path: string, report: FormReport][];
export interface SyncOptions {
  /** Remove what the contract no longer has, instead of reporting it. */
  prune?: boolean;
}

export { actionFiles, componentsDir, dataFiles, detailFiles, formFiles, listFiles, routeDir } from '../core/frontend-target.ts';

/** The files a resource's pages are made of: the route folder, plus the lib's sources (not its catalogs) or the app's data modules. */
export function resourceFiles(changes: Changes, names: ResourceNames, target: FrontendTarget | string): string[] {
  const t = toTarget(target);
  const data = dataFiles(names, t);
  // A lib's top-level modules and components/ (not the folders of its other resources).
  const top = (dir: string) => changes.list(dir).filter((name) => /\.tsx?$/.test(name)).map((name) => `${dir}/${name}`);
  const own = t.kind === 'app' ? [data.lib, data.table] : [...top(t.dir), ...filesIn(changes, `${t.dir}/components`), data.appTable!];
  return [...new Set([...filesIn(changes, routeDir(names, t)), ...own])].filter((path) => changes.exists(path));
}

/** The contract and the table of a resource, or undefined without a contract. */
function contractOf(changes: Changes, names: ResourceNames) {
  const contractPath = contractFile(names);
  const contract = changes.read(contractPath);
  if (contract === undefined) {
    return undefined;
  }
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
  if (source === undefined) {
    throw new Error(`${path} not found.`);
  }
  const { content, report } = sync(source);
  changes.update(path, () => content, { format: true });
  return [path, report];
}

/** The list page: table config (filters, sort, enum labels) and columns. */
export function syncList(changes: Changes, names: ResourceNames, target: FrontendTarget | string, options: SyncOptions = {}): FrontendReports {
  const source = contractOf(changes, names);
  if (!source) {
    return [];
  }
  const info = readResponse(source.contractPath, source.contract, names, source.table);
  const { table } = dataFiles(names, target);
  const { columns } = listFiles(names, target);
  const refs = pageRefs(names, target);
  return [
    apply(changes, table, (text) => syncTableConfig(table, text, names, info, { ...options, refs })),
    apply(changes, columns, (text) => syncColumns(columns, text, names, info, { ...options, refs })),
  ];
}

/** The detail component, and the enum labels it reads in lib/<plural>-table.ts. */
export function syncDetailPage(changes: Changes, names: ResourceNames, target: FrontendTarget | string, options: SyncOptions = {}): FrontendReports {
  const source = contractOf(changes, names);
  if (!source) {
    return [];
  }
  const info = readResponse(source.contractPath, source.contract, names, source.table);
  const { component, page } = detailFiles(names, target);
  const refs = pageRefs(names, target);
  // The page shows the title and the actions: what it reads counts too.
  const pageSource = changes.read(page);
  const reports = [
    apply(changes, component, (text) => syncDetail(component, text, names, info, pageSource ? [pageSource] : [], { ...options, refs })),
  ];
  const detail = changes.read(component)!;
  const used = info.fields.filter((f) => f.kind === 'enum' && detail.includes(enumOptionsName(names, f)));
  const { table } = dataFiles(names, target);
  if (used.length && changes.exists(table)) {
    reports.push(apply(changes, table, (text) => syncEnumOptions(table, text, names, used, refs)));
  }
  return reports;
}

/** The form: the values, defaults and options in schema.ts, the inputs in <singular>-form.tsx. */
export function syncForm(changes: Changes, names: ResourceNames, target: FrontendTarget | string, options: SyncOptions = {}): FrontendReports {
  const source = contractOf(changes, names);
  if (!source) {
    return [];
  }
  const fields = readBody(source.contractPath, source.contract, names, source.table);
  const responseKeys = responseFields(source.contractPath, source.contract, names);
  const files = formFiles(names, target);
  const refs = pageRefs(names, target);
  return [
    apply(changes, files.schema, (text) => syncFormSchema(files.schema, text, names, fields, responseKeys, { ...options, refs })),
    apply(changes, files.form, (text) => syncFormComponent(files.form, text, fields, names, { ...options, refs })),
  ];
}

/** Fields of Listed<S> and <S>Detail: what the form can read back when editing. */
function responseFields(path: string, contract: string, names: ResourceNames): Set<string> {
  const keys = new Set<string>();
  editSource(path, contract, (file) => {
    for (const name of [`Listed${names.s.pascal}`, `${names.s.pascal}Detail`]) {
      for (const prop of file.getInterface(name)?.getProperties() ?? []) {
        keys.add(prop.getName());
      }
    }
  });
  return keys;
}

/** The parts of a resource's pages, each with the files it needs (a part without them is skipped). */
const PARTS = [
  { part: 'list', files: (n: ResourceNames, t: FrontendTarget) => [dataFiles(n, t).table, listFiles(n, t).columns], sync: syncList },
  { part: 'detail', files: (n: ResourceNames, t: FrontendTarget) => [detailFiles(n, t).component], sync: syncDetailPage },
  { part: 'form', files: (n: ResourceNames, t: FrontendTarget) => [formFiles(n, t).schema, formFiles(n, t).form], sync: syncForm },
] as const;

/**
 * The whole resource: list, detail and form, those it has. Then the fields
 * the contract dropped that the pages still read elsewhere (titles, dialogs,
 * links), as `file:line` for the warnings.
 */
export function syncResourcePages(changes: Changes, names: ResourceNames, target: FrontendTarget | string, options: SyncOptions = {}) {
  const t = toTarget(target);
  const source = contractOf(changes, names);
  if (!source) {
    throw new Error(`${contractFile(names)} not found: generate the backend first (dafne g backend-resource ${names.p.kebab}).`);
  }
  const reports: FrontendReports = [];
  const skipped: string[] = [];
  for (const { part, files, sync } of PARTS) {
    if (files(names, t).every((path) => changes.exists(path))) {
      reports.push(...sync(changes, names, t, options));
    } else {
      skipped.push(part);
    }
  }
  if (skipped.length === PARTS.length) {
    throw new Error(`${t.kind === 'app' ? routeDir(names, t) : t.dir}: no list, detail or form to sync (dafne g frontend-resource ${names.p.kebab}).`);
  }
  if (options.prune) {
    reports.push(...pruneEnumOptions(changes, names, t, source.contract));
    reports.push(...useIdForDropped(changes, names, t, source.contractPath, source.contract));
  }
  return { reports, skipped, leftovers: leftoverReads(changes, names, t, source.contractPath, source.contract) };
}

/** The .ts/.tsx files under a folder of the tree, but the catalogs (messages/). */
function filesIn(changes: Changes, dir: string): string[] {
  return changes.list(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (changes.exists(path)) {
      return /\.tsx?$/.test(name) ? [path] : [];
    }
    return name === 'messages' ? [] : filesIn(changes, path);
  });
}

/**
 * The labels of enums the contract no longer exports (STATUS_OPTIONS in
 * schema.ts, INVOICE_STATUS_OPTIONS in lib/<plural>-table.ts, typed
 * `satisfies { value: InvoiceStatus; … }`), then what used only them in the
 * resource's pages: `const statusOptions = useOptionLabels(STATUS_OPTIONS)`
 * and the imports.
 */
function pruneEnumOptions(changes: Changes, names: ResourceNames, target: FrontendTarget, contract: string): FrontendReports {
  const exported = (type: string) => new RegExp(`\\bexport\\s+type\\s+${type}\\b`).test(contract);
  const removed = new Set<string>();
  const reports: FrontendReports = [];
  for (const path of [dataFiles(names, target).table, formFiles(names, target).schema]) {
    if (!changes.exists(path)) {
      continue;
    }
    const report: FormReport = { added: [], removed: [], stale: [], warnings: [] };
    changes.update(
      path,
      (text) =>
        editSource(path, text, (file) => {
          for (;;) {
            // Looked up again after each removal (ts-morph forgets the old nodes).
            const statement = file.getVariableStatements().find((st) => {
              const type = /satisfies\s*\{\s*value:\s*(\w+)/.exec(st.getText())?.[1];
              return type && /_OPTIONS$/.test(st.getDeclarations()[0]?.getName() ?? '') && !exported(type);
            });
            if (!statement) {
              break;
            }
            const name = statement.getDeclarations()[0].getName();
            statement.remove();
            removed.add(name);
            report.removed!.push(name);
          }
          if (report.removed!.length) {
            removeUnusedImports(file, (m) => m === CONTRACTS_PACKAGE || m === '@dafne/frontend-ui/lib/message-key' || m === './messages/index.ts');
          }
        }),
      { format: true },
    );
    if (report.removed!.length) {
      reports.push([path, report]);
    }
  }
  if (!removed.size) {
    return reports;
  }

  const uses = (text: string, name: string) => [...text.matchAll(new RegExp(`\\b${name}\\b`, 'g'))].length;
  for (const path of resourceFiles(changes, names, target)) {
    const source = changes.read(path)!;
    if (![...removed].some((name) => uses(source, name))) {
      continue;
    }
    const report: FormReport = { added: [], removed: [], stale: [], warnings: [] };
    changes.update(
      path,
      (text) =>
        editSource(path, text, (file) => {
          for (;;) {
            // `const statusOptions = useOptionLabels(STATUS_OPTIONS);`, unless statusOptions is still used.
            const hook = file.getDescendantsOfKind(SyntaxKind.VariableStatement).find((st) => {
              const decl = st.getDeclarations()[0];
              const init = decl?.getInitializer()?.getText() ?? '';
              return [...removed].some((name) => new RegExp(`^use\\w+\\(\\s*${name}\\s*\\)$`).test(init)) && uses(file.getFullText(), decl.getName()) === 1;
            });
            if (!hook) {
              break;
            }
            report.removed!.push(hook.getDeclarations()[0].getName());
            hook.remove();
          }
          removeUnusedImports(file, (m) => m.startsWith('.') || m.startsWith('@/lib/') || m === '@dafne/frontend-ui/hooks/use-option-labels');
        }),
      { format: true },
    );
    const left = [...removed].filter((name) => uses(changes.read(path)!, name));
    for (const name of left) {
      report.warnings.push(`${path}: still uses ${name}, whose enum the contract dropped: fix it by hand.`);
    }
    if (report.removed!.length || left.length) {
      reports.push([path, report]);
    }
  }
  return reports;
}

/**
 * Where the pages still read a field the contract dropped (`order.name` as
 * the title, the breadcrumb, a dialog's text…), the record's label takes
 * its place: `${t("orders.singular")} ${order.id}` ("Order 12"), or
 * `String(order.id)` in a file without `t`. The field also leaves the
 * `<S>Ref` type (what the dialogs take).
 */
function useIdForDropped(changes: Changes, names: ResourceNames, target: FrontendTarget, contractPath: string, contract: string): FrontendReports {
  const info = readResponse(contractPath, contract, names);
  const known = new Set([...info.fields.map((f) => f.key), ...info.skipped, 'id']);
  // `row.original` is the record only in the list's columns (other tables have other rows).
  const { columns } = listFiles(names, target);
  const reports: FrontendReports = [];
  for (const path of resourceFiles(changes, names, target)) {
    const records = new Set(path === columns ? [names.s.camel, 'row.original'] : [names.s.camel]);
    const report: FormReport = { added: [], removed: [], stale: [], warnings: [] };
    changes.update(
      path,
      (text) =>
        editSource(path, text, (file) => {
          const hasT = /\bconst t = (await getTranslations|useTranslations)\(/.test(file.getFullText());
          // Looked up again after each edit (ts-morph forgets the old nodes).
          const next = () =>
            file.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).find(
              (pa) => records.has(pa.getExpression().getText()) && !known.has(pa.getName()),
            );
          for (let read = next(); read; read = next()) {
            const record = read.getExpression().getText();
            const id = `${record}${read.hasQuestionDotToken() ? '?.' : '.'}id`;
            const label = hasT ? `\`\${t("${names.p.camel}.singular")} \${${id}}\`` : `String(${id})`;
            report.removed!.push(`${read.getText()} (now ${label})`);
            read.replaceWithText(label);
          }
          // export type OrderRef = { id: number; name: string } loses name.
          const ref = () =>
            file
              .getTypeAlias(`${names.s.pascal}Ref`)
              ?.getTypeNode()
              ?.asKind(SyntaxKind.TypeLiteral)
              ?.getProperties()
              .find((prop) => !known.has(prop.getName()));
          for (let prop = ref(); prop; prop = ref()) {
            report.removed!.push(`${names.s.pascal}Ref: ${prop.getName()}`);
            prop.remove();
          }
        }),
      { format: true },
    );
    if (report.removed!.length) {
      reports.push([path, report]);
    }
  }
  return reports;
}

/** `<record>.x` and `row.original.x` reads, in the resource's files, of fields the contract doesn't have. */
function leftoverReads(changes: Changes, names: ResourceNames, target: FrontendTarget, contractPath: string, contract: string): string[] {
  const info = readResponse(contractPath, contract, names);
  const known = new Set([...info.fields.map((f) => f.key), ...info.skipped]);
  const found: string[] = [];
  const { columns } = listFiles(names, target);
  for (const path of resourceFiles(changes, names, target)) {
    // `row.original` is the record only in the list's columns.
    const read = new RegExp(`\\b(?:${names.s.camel}\\??${path === columns ? '|row\\.original' : ''})\\.(\\w+)\\b`, 'g');
    const lines = (changes.read(path) ?? '').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(read)) {
        if (!known.has(m[1])) {
          found.push(`${path}:${i + 1}: ${m[0]}`);
        }
      }
    });
  }
  return found;
}

/** Turns the reports into warnings of the change set (what was added is in the files). */
export function warnReports(changes: Changes, reports: FrontendReports) {
  for (const [file, report] of reports) {
    for (const item of report.stale) {
      changes.warn(`${file}: ${item} isn't in the contract any more: kept. Remove it if the field was dropped.`);
    }
    for (const warning of report.warnings) {
      changes.warn(warning);
    }
  }
}

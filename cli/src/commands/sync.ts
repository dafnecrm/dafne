import { syncMessages } from '../wiring/messages.js';
import * as p from '@clack/prompts';
import { Command } from 'commander';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Changes } from '../core/changes.js';
import { formatSource } from '../core/format.js';
import { resourceNames, type ResourceNames } from '../core/names.js';
import { findRoot } from '../core/workspace.js';
import { contractFile } from '../generators/backend.js';
import { childRoles, MESSAGE_KEY_IMPORT, OPTIONAL_DATE_HELPER, syncChildContract, syncContract, type SyncReport } from '../sync/contract.js';
import { syncChildService, syncService } from '../sync/service.js';
import { syncContractSpec, syncServiceSpec } from '../sync/service-spec.js';
import { API_TAGS, foreignRelations, readTable, tablesIn, type TableInfo } from '../sync/table.js';
import { editSource } from '../wiring/ast.js';
import { BACKEND } from '../wiring/backend.js';
import { FRONTEND } from '../wiring/frontend.js';
import { syncDetail } from '../sync/detail.js';
import { readBody, syncFormComponent, syncFormSchema, type FormReport } from '../sync/form.js';
import { syncColumns, syncEnumOptions, syncTableConfig } from '../sync/table-page.js';
import { enumOptionsName, readResponse } from '../sync/response.js';

interface SyncOptions {
  root?: string;
  all?: boolean;
  service?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

const TABLES = `${BACKEND}/libs/database/src/tables`;
const tableFile = ({ p }: ResourceNames) => `${TABLES}/${p.kebab}.ts`;

/** Resources with both a table file and a contract. */
export function syncable(changes: Changes): string[] {
  return readdirSync(join(changes.root, TABLES))
    .filter((file) => file.endsWith('.ts') && file !== 'auth.ts')
    .map((file) => file.replace(/\.ts$/, ''))
    .filter((name) => {
      try {
        return changes.exists(contractFile(resourceNames(name)));
      } catch {
        return false;
      }
    });
}

export async function syncOne(
  changes: Changes,
  name: string,
  dropped: string[] = [],
  { service = true }: { service?: boolean } = {},
): Promise<SyncReport> {
  const names = resourceNames(name);
  const tablePath = tableFile(names);
  const contractPath = contractFile(names);
  const table = changes.read(tablePath);
  if (table === undefined) throw new Error(`${tablePath} not found.`);
  if (!changes.exists(contractPath))
    throw new Error(`${contractPath} not found: create it with "dafne g backend contract ${names.p.kebab}".`);

  const info = readTable(tablePath, table, names);
  addForeignRelations(changes, tablePath, info);
  const source = changes.read(contractPath)!;
  let { content, report } = syncContract(contractPath, source, names, info, dropped);

  // Child tables (customerAddress for customer.addresses): their own body
  // schema and response interface, when the contract has them.
  const children = childTables(tablePath, table, info, content);
  for (const child of children) {
    const result = syncChildContract(contractPath, content, child.names, child.info, info.variable);
    content = result.content;
    mergeReport(report, result.report);
    report.warnings.push(...child.info.warnings);
  }
  // Compare formatted, so a rewrite that changes only the layout is no change.
  const formatted = await formatSource(join(changes.root, contractPath), content, source);
  if (formatted !== source) changes.update(contractPath, () => formatted);
  if (formatted.includes('optionalDate(')) {
    const common = `${BACKEND}/libs/contracts/src/common.ts`;
    changes.update(common, (text) => {
      if (/export const optionalDate\b/.test(text)) return text;
      // Its error is a message key.
      if (!text.includes('ContractMessageKey'))
        text = text.replace(/^(import [^\n]*\n)/, `$1${MESSAGE_KEY_IMPORT}\n`);
      return text.replace(/\n*$/, '\n') + OPTIONAL_DATE_HELPER;
    });
  }
  report.warnings.unshift(...info.warnings);

  // Sample bodies in the specs: fields that left the body (or the table)
  // are dropped from them; other unknown keys may be there on purpose
  // (e.g. a test that the schema rejects deletedAt).
  const bodyNow = readBody(contractPath, formatted, names, info);
  const fieldsBefore = readBody(contractPath, source, names, info);
  const bodyBefore = new Set(fieldsBefore.map((f) => f.key));
  // Samples only get the fields that become required now (see syncSpecSamples).
  const requiredBefore = new Set(fieldsBefore.filter((f) => !f.optional && f.defaultValue === undefined).map((f) => f.key));
  const leftBody = new Set([...dropped, ...[...bodyBefore].filter((k) => !bodyNow.some((f) => f.key === k))]);

  // The service's queries: list select, detail columns, insert and update.
  const servicePath = `${BACKEND}/libs/${names.p.kebab}/src/${names.p.kebab}.service.ts`;
  const serviceSource = service ? changes.read(servicePath) : undefined;
  if (serviceSource !== undefined) {
    const result = syncService(servicePath, serviceSource, names, info, dropped);
    for (const child of children) {
      const childResult = syncChildService(servicePath, result.content, names, child.info, child.relation, (c) => childRoles(c, info.variable));
      result.content = childResult.content;
      result.report.added.push(...childResult.report.added);
      result.report.removed.push(...childResult.report.removed);
      result.report.warnings.push(...childResult.report.warnings);
    }
    changes.update(servicePath, () => result.content);
    report.added.push(...result.report.added.map((item) => `service ${item}`));
    report.removed.push(...result.report.removed.map((item) => `service ${item}`));
    report.warnings.push(...result.report.warnings);

    // The specs' sample bodies must stay valid for the (strict) body schema.
    const specPath = servicePath.replace(/\.ts$/, '.spec.ts');
    const specSource = changes.read(specPath);
    if (specSource !== undefined) {
      const spec = syncServiceSpec(specPath, specSource, bodyNow, leftBody, requiredBefore);
      changes.update(specPath, () => spec.content);
      report.added.push(...spec.report.added.map((key) => `service spec body samples: ${key}`));
      report.removed.push(...spec.report.removed.map((key) => `service spec body samples: ${key}`));
    }
  }

  const contractSpecPath = contractPath.replace(/\.ts$/, '.spec.ts');
  const contractSpec = changes.read(contractSpecPath);
  if (contractSpec !== undefined) {
    const spec = syncContractSpec(contractSpecPath, contractSpec, `${names.s.camel}BodySchema`, bodyNow, leftBody, requiredBefore);
    changes.update(contractSpecPath, () => spec.content);
    report.added.push(...spec.report.added.map((key) => `contract spec samples: ${key}`));
    report.removed.push(...spec.report.removed.map((key) => `contract spec samples: ${key}`));
  }
  return report;
}

/** Adds the relations other table files declare for the resource (see foreignRelations). */
function addForeignRelations(changes: Changes, tablePath: string, info: TableInfo) {
  for (const file of readdirSync(join(changes.root, TABLES))) {
    const path = `${TABLES}/${file}`;
    if (!file.endsWith('.ts') || path === tablePath) continue;
    const source = changes.read(path);
    if (source === undefined || !source.includes('defineRelationsPart')) continue;
    for (const [name, target] of Object.entries(foreignRelations(path, source, info.variable)))
      if (!info.relations.includes(name)) {
        info.relations.push(name);
        info.relationTargets[name] = target;
      }
  }
}

interface ChildTable {
  names: ResourceNames;
  info: TableInfo;
  /** The parent's relation to it, e.g. addresses. */
  relation: string;
}

/**
 * The other tables of the resource's table file that a relation of the
 * resource reaches, and whose contract parts (<child>BodySchema or the
 * <Child> interface) exist.
 */
function childTables(tablePath: string, table: string, parent: TableInfo, contract: string): ChildTable[] {
  return tablesIn(tablePath, table).flatMap((variable) => {
    if (variable === parent.variable) return [];
    const relation = Object.entries(parent.relationTargets).find(([, target]) => target === variable)?.[0];
    if (!relation) return [];
    const names = resourceNames(variable);
    const hasParts =
      new RegExp(`\\b${names.s.camel}BodySchema\\b`).test(contract) || new RegExp(`\\binterface ${names.s.pascal}\\b`).test(contract);
    return hasParts ? [{ names, info: readTable(tablePath, table, names), relation }] : [];
  });
}

function mergeReport(into: SyncReport, from: SyncReport) {
  for (const key of ['added', 'removed', 'unknown', 'required', 'warnings'] as const) into[key].push(...from[key]);
}

export function printSync(name: string, report: SyncReport, changed: boolean) {
  const lines = [
    ...report.added.map((item) => `+ ${item}`),
    ...report.removed.map((item) => `- ${item}`),
  ];
  if (!changed) p.log.success(`${name}: already in sync.`);
  else p.note(lines.join('\n') || 'Formatting only', name);
  for (const item of report.unknown)
    p.log.warn(`${item} isn't a column of the table: kept. Remove it if the column was dropped.`);
  for (const warning of report.warnings) p.log.warn(warning);
  if (report.required.length)
    p.log.warn(
      `New required body fields: ${report.required.join(', ')}. Add them to the frontend form (dafne sync frontend form).`,
    );
}

export function syncCommand() {
  const sync = new Command('sync')
    .description('Bring code in line with the database tables')
    .addHelpText(
      'after',
      `
After changing a table:
  dafne sync contract activities    # backend: contract, service queries, specs
  dafne sync frontend activities    # frontend: form, table and detail together

Or one frontend part at a time: dafne sync frontend form|table|detail activities.
contract and frontend also take --all; every command takes --dry-run.`,
    );

  sync
    .command('contract')
    .description(
      'Update libs/contracts/src/<plural>.ts and the service queries (list, detail, create, update) from libs/database/src/tables/<plural>.ts, keeping hand-written code',
    )
    .argument('[name]', 'resource name, singular or plural')
    .option('--all', 'every table that has a contract')
    .option('--no-service', "don't update the service's queries (list, detail, create, update)")
    .option('--root <dir>', 'Dafne folder (with backend/ and frontend/)')
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt')
    .addHelpText(
      'after',
      `
Columns go in the body, the responses, the filters and the sort fields by
default. Change that with a comment above the column in the table:

  /** @api internal */    used only by the backend: never in the contract
  testinternal: varchar('testinternal', { length: 10 }),

Tags: ${API_TAGS.join(', ')}.
id, createdById/updatedById, deletedAt and server-filled columns
(defaultNow, $onUpdate…) follow the customers contract.`,
    )
    .action(async (name: string | undefined, options: SyncOptions) => {
      p.intro('dafne sync contract');
      const changes = new Changes(findRoot(options.root));
      let resources: string[];
      if (options.all) resources = syncable(changes);
      else if (name) resources = [name];
      else if (!options.yes && process.stdin.isTTY) {
        const choices = syncable(changes);
        if (!choices.length) throw new Error('No table has a contract to sync.');
        const picked = await p.select({
          message: 'Which contract?',
          options: choices.map((value) => ({ value, label: value })),
        });
        if (p.isCancel(picked)) return p.cancel('Nothing changed.');
        resources = [picked];
      } else throw new Error('Missing argument: the resource name, or --all.');

      for (const resource of resources) {
        const before = changes.summary().length;
        const report = await syncOne(changes, resource, [], { service: options.service });
        printSync(resource, report, changes.summary().length > before);
      }

      if (!changes.summary().length || options.dryRun) return p.outro(options.dryRun ? 'Dry run: nothing written.' : 'Done.');
      {
        const note = syncMessages(changes);
        if (note) p.log.warn(note);
      }
      await changes.commit();
      p.note(
        [
          'cd backend && npx tsc --noEmit && pnpm test',
          'dafne sync frontend <resource>   # form, table and detail',
        ].join('\n'),
        'Next steps',
      );
      p.outro('Done.');
    });

  const frontend = sync
    .command('frontend')
    .description('Sync the form, table and detail page together (or one of them: frontend form|table|detail)')
    // Options after a part (frontend form --root ..) belong to the part.
    .enablePositionalOptions()
    .argument('[name]', 'resource name, singular or plural')
    .option('--all', 'every resource with a table and a contract')
    .option('--root <dir>', 'Dafne folder (with backend/ and frontend/)')
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt')
    .addHelpText(
      'after',
      `
The same as dafne sync frontend form, table and detail one after the other
(see their help for what each one adds). A part the resource doesn't have
(no form, no detail page…) is skipped. Run dafne sync contract first if the
table changed.`,
    )
    .action(async (name: string | undefined, options: SyncOptions) => {
      p.intro('dafne sync frontend');
      const changes = new Changes(findRoot(options.root));
      const withFrontend = () => syncable(changes).filter((r) => frontendParts(changes, r).length);
      let resources: string[];
      if (options.all) resources = withFrontend();
      else if (name) resources = [name];
      else {
        const choices = withFrontend();
        if (options.yes || !process.stdin.isTTY || !choices.length)
          throw new Error('Missing argument: the resource name, or --all.');
        const picked = await p.select({ message: 'Which resource?', options: choices.map((value) => ({ value, label: value })) });
        if (p.isCancel(picked)) return p.cancel('Nothing changed.');
        resources = [picked];
      }

      for (const resource of resources) {
        const before = changes.summary().length;
        const { reports, skipped } = syncFrontend(changes, resource);
        if (!reports.length) throw new Error(`${resource}: no form, table or detail page to sync.`);
        if (changes.summary().length === before) p.log.success(`${resource}: already in sync.`);
        printFrontendReports(reports);
        if (skipped.length) p.log.info(`${resource}: no ${skipped.join(', ')}; skipped.`);
      }

      if (!changes.summary().length) return p.outro('Done: nothing to add.');
      if (options.dryRun) return p.outro('Dry run: nothing written.');
      {
        const note = syncMessages(changes);
        if (note) p.log.warn(note);
      }
      await changes.commit();
      p.note(
        ['Check the new inputs, columns and details: their place, labels and defaults.', 'cd frontend && npx tsc --noEmit'].join('\n'),
        'Next steps',
      );
      p.outro('Done.');
    });

  frontend
    .command('form')
    .description(
      'Add the contract body fields a frontend form lacks (values type, defaults, inputs), leaving the rest as it is',
    )
    .argument('[name]', 'resource name, singular or plural')
    .option('--root <dir>', 'Dafne folder (with backend/ and frontend/)')
    .option('--dry-run', 'show what would change, write nothing')
    .option('-y, --yes', 'never prompt')
    .addHelpText(
      'after',
      `
It reads <singular>BodySchema in backend/libs/contracts/src/<plural>.ts and
edits frontend/app/[locale]/(app)/<plural>/schema.ts and <singular>-form.tsx. A field
counts as present when the form has a <form.AppField name="…"> for it,
wherever it is. For a field that must have no input, write in the form:

  {/* dafne-ignore: customerId */}

It's still added to the values type and the defaults (the form sends it).
To sync the table and detail page too, use dafne sync frontend <resource>.

A text column gets a textarea; for a rich text editor (HTML), write above
the column in the table:

  /** @form editor */
  description: text('description'),`,
    )
    .action(async (name: string | undefined, options: SyncOptions) => {
      p.intro('dafne sync frontend form');
      const changes = new Changes(findRoot(options.root));
      if (!name) {
        const choices = syncable(changes).filter((r) => changes.exists(formFiles(resourceNames(r)).form));
        if (options.yes || !process.stdin.isTTY || !choices.length)
          throw new Error('Missing argument: the resource name.');
        const picked = await p.select({ message: 'Which form?', options: choices.map((value) => ({ value, label: value })) });
        if (p.isCancel(picked)) return p.cancel('Nothing changed.');
        name = picked;
      }
      printFrontendReports(syncForm(changes, name));
      if (!changes.summary().length) return p.outro(`${name}: the form already has every field.`);
      if (options.dryRun) return p.outro('Dry run: nothing written.');
      {
        const note = syncMessages(changes);
        if (note) p.log.warn(note);
      }
      await changes.commit();
      p.note(
        [
          'Check the new inputs: their place in the form, labels and the default values.',
          'cd frontend && npx tsc --noEmit',
        ].join('\n'),
        'Next steps',
      );
      p.outro('Done.');
    });

  for (const [command, description, files, run] of [
    [
      'table',
      'Add the contract fields the table lacks: sort fields, filters, enum labels (lib/<plural>-table.ts) and columns (app/[locale]/(app)/<plural>/<plural>-table.tsx)',
      (n: ResourceNames) => [tableFiles(n).table, tableFiles(n).columns],
      syncTablePage,
    ],
    [
      'detail',
      'Add the contract fields the detail page lacks (<singular>-detail.tsx, or [id]/page.tsx), in its "Details" section',
      (n: ResourceNames) => [detailFiles(n).page],
      syncDetailPage,
    ],
  ] as const)
    frontend
      .command(command)
      .description(description)
      .argument('[name]', 'resource name, singular or plural')
      .option('--root <dir>', 'Dafne folder (with backend/ and frontend/)')
      .option('--dry-run', 'show what would change, write nothing')
      .option('-y, --yes', 'never prompt')
      .addHelpText(
        'after',
        `
It reads Listed<S>, <S>Detail and the sort/filter fields of the contract and
only adds what's missing. A field counts as present when the file already
uses it (a column, a filter, <record>.<field> on the detail page), wherever
it is. To keep a field out, write in that file:

  {/* dafne-ignore: customerId */}    (or // dafne-ignore: … in a .ts file)

To sync the form, table and detail page together, use dafne sync frontend <resource>.`,
      )
      .action(async (name: string | undefined, options: SyncOptions) => {
        p.intro(`dafne sync frontend ${command}`);
        const changes = new Changes(findRoot(options.root));
        if (!name) {
          const choices = syncable(changes).filter((r) => files(resourceNames(r)).every((f) => changes.exists(f)));
          if (options.yes || !process.stdin.isTTY || !choices.length) throw new Error('Missing argument: the resource name.');
          const picked = await p.select({ message: `Which ${command}?`, options: choices.map((value) => ({ value, label: value })) });
          if (p.isCancel(picked)) return p.cancel('Nothing changed.');
          name = picked;
        }
        printFrontendReports(run(changes, name));
        if (!changes.summary().length) return p.outro(`${name}: the ${command} already has every field.`);
        if (options.dryRun) return p.outro('Dry run: nothing written.');
        {
        const note = syncMessages(changes);
        if (note) p.log.warn(note);
      }
      await changes.commit();
        p.note(['Check the new entries: their place, labels and formatting.', 'cd frontend && npx tsc --noEmit'].join('\n'), 'Next steps');
        p.outro('Done.');
      });


  return sync;
}

type FrontendPart = 'form' | 'table' | 'detail';

/** The frontend parts a resource has, i.e. whose files all exist. */
function frontendParts(changes: Changes, name: string): FrontendPart[] {
  const names = resourceNames(name);
  const files: Record<FrontendPart, string[]> = {
    form: Object.values(formFiles(names)),
    table: Object.values(tableFiles(names, changes)),
    detail: [detailFile(names, changes)],
  };
  return (Object.keys(files) as FrontendPart[]).filter((part) => files[part].every((f) => changes.exists(f)));
}

/** sync frontend form, table and detail for one resource; the parts it lacks are skipped. */
export function syncFrontend(
  changes: Changes,
  name: string,
): { reports: [string, FormReport][]; skipped: FrontendPart[] } {
  const run: Record<FrontendPart, (changes: Changes, name: string) => [string, FormReport][]> = {
    form: syncForm,
    table: syncTablePage,
    detail: syncDetailPage,
  };
  const present = frontendParts(changes, name);
  return {
    reports: present.flatMap((part) => run[part](changes, name)),
    skipped: (Object.keys(run) as FrontendPart[]).filter((part) => !present.includes(part)),
  };
}

export function printFrontendReports(reports: [string, FormReport][]) {
  for (const [file, report] of reports) {
    const lines = report.added.map((item) => `+ ${item}`);
    if (lines.length) p.note(lines.join('\n'), file);
    for (const item of report.stale)
      p.log.warn(`${file}: ${item} isn't in the contract any more: kept. Remove it if the field was dropped.`);
    for (const warning of report.warnings) p.log.warn(warning);
  }
}

/** The columns are in <plural>-table.tsx; older resources have a columns.tsx. */
const tableFiles = ({ p }: ResourceNames, changes?: Changes) => {
  const dir = `${FRONTEND}/app/[locale]/(app)/${p.kebab}`;
  const legacy = `${dir}/columns.tsx`;
  return {
    table: `${FRONTEND}/lib/${p.kebab}-table.ts`,
    columns: changes?.exists(legacy) ? legacy : `${dir}/${p.kebab}-table.tsx`,
  };
};
/** The <singular>-detail component; older resources have it in [id]/page.tsx. */
const detailFiles = ({ s, p }: ResourceNames) => ({
  component: `${FRONTEND}/app/[locale]/(app)/${p.kebab}/${s.kebab}-detail.tsx`,
  page: `${FRONTEND}/app/[locale]/(app)/${p.kebab}/[id]/page.tsx`,
});
const detailFile = (names: ResourceNames, changes?: Changes) => {
  const { component, page } = detailFiles(names);
  return !changes || changes.exists(component) ? component : page;
};

/** The contract's response fields, with the table for date kinds. */
function response(changes: Changes, names: ResourceNames) {
  const contractPath = contractFile(names);
  const contract = changes.read(contractPath);
  if (contract === undefined) throw new Error(`${contractPath} not found.`);
  const tablePath = tableFile(names);
  const tableSource = changes.read(tablePath);
  const table = tableSource === undefined ? undefined : readTable(tablePath, tableSource, names);
  return readResponse(contractPath, contract, names, table);
}

function applyFrontend(
  changes: Changes,
  path: string,
  hint: string,
  sync: (source: string) => { content: string; report: FormReport },
): [string, FormReport] {
  const source = changes.read(path);
  if (source === undefined) throw new Error(`${path} not found: generate it with "${hint}".`);
  const { content, report } = sync(source);
  changes.update(path, () => content, { format: true });
  return [path, report];
}

export function syncTablePage(changes: Changes, name: string): [string, FormReport][] {
  const names = resourceNames(name);
  const info = response(changes, names);
  const files = tableFiles(names, changes);
  const hint = `dafne g frontend table ${names.p.kebab}`;
  return [
    applyFrontend(changes, files.table, hint, (source) => syncTableConfig(files.table, source, names, info)),
    applyFrontend(changes, files.columns, hint, (source) => syncColumns(files.columns, source, names, info)),
  ];
}

export function syncDetailPage(changes: Changes, name: string): [string, FormReport][] {
  const names = resourceNames(name);
  const info = response(changes, names);
  const path = detailFile(names, changes);
  const { page } = detailFiles(names);
  // The page shows the title and the actions: what it reads counts too.
  const pageSource = path !== page ? changes.read(page) : undefined;
  const hint = `dafne g frontend detail ${names.p.kebab}`;
  const reports = [
    applyFrontend(changes, path, hint, (source) => syncDetail(path, source, names, info, pageSource ? [pageSource] : [])),
  ];
  // The enum labels it reads live in lib/<plural>-table.ts: make sure they're
  // there, also when the resource has no table page to add them.
  const detail = changes.read(path)!;
  const used = info.fields.filter((f) => f.kind === 'enum' && detail.includes(enumOptionsName(names, f)));
  const lib = tableFiles(names).table;
  if (used.length && changes.exists(lib))
    reports.push(applyFrontend(changes, lib, hint, (source) => syncEnumOptions(lib, source, names, used)));
  return reports;
}

const formFiles = ({ s, p }: ResourceNames) => {
  const dir = `${FRONTEND}/app/[locale]/(app)/${p.kebab}`;
  return { schema: `${dir}/schema.ts`, form: `${dir}/${s.kebab}-form.tsx` };
};

/** Adds the contract's new body fields to the form; returns the reports by file. */
export function syncForm(changes: Changes, name: string): [string, FormReport][] {
  const names = resourceNames(name);
  const contractPath = contractFile(names);
  const contract = changes.read(contractPath);
  if (contract === undefined) throw new Error(`${contractPath} not found.`);
  const tablePath = tableFile(names);
  const tableSource = changes.read(tablePath);
  const table = tableSource === undefined ? undefined : readTable(tablePath, tableSource, names);
  const fields = readBody(contractPath, contract, names, table);
  const responseKeys = responseFields(contractPath, contract, names);

  const files = formFiles(names);
  const reports: [string, FormReport][] = [];
  for (const [path, sync] of [
    [files.schema, (source: string) => syncFormSchema(files.schema, source, names, fields, responseKeys)],
    [files.form, (source: string) => syncFormComponent(files.form, source, fields, names)],
  ] as const) {
    const source = changes.read(path);
    if (source === undefined) throw new Error(`${path} not found: generate the form with "dafne g frontend form ${names.p.kebab}".`);
    const { content, report } = sync(source);
    changes.update(path, () => content, { format: true });
    reports.push([path, report]);
  }
  return reports;
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

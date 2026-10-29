import * as p from '@clack/prompts';
import { Command } from 'commander';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Changes } from '../core/changes.js';
import { formatSource } from '../core/format.js';
import { resourceNames, type ResourceNames } from '../core/names.js';
import { findRoot } from '../core/workspace.js';
import { contractFile } from '../generators/backend.js';
import { OPTIONAL_DATE_HELPER, syncContract, type SyncReport } from '../sync/contract.js';
import { API_TAGS, readTable } from '../sync/table.js';
import { editSource } from '../wiring/ast.js';
import { BACKEND } from '../wiring/backend.js';
import { FRONTEND } from '../wiring/frontend.js';
import { syncDetail } from '../sync/detail.js';
import { readBody, syncFormComponent, syncFormSchema, type FormReport } from '../sync/form.js';
import { syncColumns, syncTableConfig } from '../sync/table-page.js';
import { readResponse } from '../sync/response.js';

interface SyncOptions {
  root?: string;
  all?: boolean;
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

export async function syncOne(changes: Changes, name: string, dropped: string[] = []): Promise<SyncReport> {
  const names = resourceNames(name);
  const tablePath = tableFile(names);
  const contractPath = contractFile(names);
  const table = changes.read(tablePath);
  if (table === undefined) throw new Error(`${tablePath} not found.`);
  if (!changes.exists(contractPath))
    throw new Error(`${contractPath} not found: create it with "dafne g backend contract ${names.p.kebab}".`);

  const info = readTable(tablePath, table, names);
  const source = changes.read(contractPath)!;
  const { content, report } = syncContract(contractPath, source, names, info, dropped);
  // Compare formatted, so a rewrite that changes only the layout is no change.
  const formatted = await formatSource(join(changes.root, contractPath), content, source);
  if (formatted !== source) changes.update(contractPath, () => formatted);
  if (formatted.includes('optionalDate(')) {
    const common = `${BACKEND}/libs/contracts/src/common.ts`;
    changes.update(common, (text) =>
      /export const optionalDate\b/.test(text) ? text : text.replace(/\n*$/, '\n') + OPTIONAL_DATE_HELPER,
    );
  }
  report.warnings.unshift(...info.warnings);
  return report;
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
      `New required body fields: ${report.required.join(', ')}. Add them to the samples in the contract spec and to the frontend form.`,
    );
}

export function syncCommand() {
  const sync = new Command('sync').description('Bring code in line with the database tables');

  sync
    .command('contract')
    .description(
      'Update libs/contracts/src/<plural>.ts from libs/database/src/tables/<plural>.ts, keeping hand-written validation',
    )
    .argument('[name]', 'resource name, singular or plural')
    .option('--all', 'every table that has a contract')
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
        const report = await syncOne(changes, resource);
        printSync(resource, report, changes.summary().length > before);
      }

      if (!changes.summary().length || options.dryRun) return p.outro(options.dryRun ? 'Dry run: nothing written.' : 'Done.');
      await changes.commit();
      p.note(
        [
          'The service and the frontend still use the old fields; the typecheck shows where:',
          'cd backend && npx tsc --noEmit && pnpm test',
          'cd frontend && npx tsc --noEmit',
          'Update the service (select, insert, update), the form (schema.ts, form) and the columns.',
        ].join('\n'),
        'Next steps',
      );
      p.outro('Done.');
    });

  sync
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
edits frontend/app/(app)/<plural>/schema.ts and <singular>-form.tsx. A field
counts as present when the form has a <form.AppField name="…"> for it,
wherever it is. For a field that must have no input, write in the form:

  {/* dafne-ignore: customerId */}

It's still added to the values type and the defaults (the form sends it).`,
    )
    .action(async (name: string | undefined, options: SyncOptions) => {
      p.intro('dafne sync form');
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
      'Add the contract fields the table lacks: sort fields, filters, enum labels (lib/<plural>-table.ts) and columns (app/(app)/<plural>/<plural>-table.tsx)',
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
    sync
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

  {/* dafne-ignore: customerId */}    (or // dafne-ignore: … in a .ts file)`,
      )
      .action(async (name: string | undefined, options: SyncOptions) => {
        p.intro(`dafne sync ${command}`);
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
        await changes.commit();
        p.note(['Check the new entries: their place, labels and formatting.', 'cd frontend && npx tsc --noEmit'].join('\n'), 'Next steps');
        p.outro('Done.');
      });

  return sync;
}

function printFrontendReports(reports: [string, FormReport][]) {
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
  const dir = `${FRONTEND}/app/(app)/${p.kebab}`;
  const legacy = `${dir}/columns.tsx`;
  return {
    table: `${FRONTEND}/lib/${p.kebab}-table.ts`,
    columns: changes?.exists(legacy) ? legacy : `${dir}/${p.kebab}-table.tsx`,
  };
};
/** The <singular>-detail component; older resources have it in [id]/page.tsx. */
const detailFiles = ({ s, p }: ResourceNames) => ({
  component: `${FRONTEND}/app/(app)/${p.kebab}/${s.kebab}-detail.tsx`,
  page: `${FRONTEND}/app/(app)/${p.kebab}/[id]/page.tsx`,
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
  return [
    applyFrontend(changes, path, `dafne g frontend detail ${names.p.kebab}`, (source) =>
      syncDetail(path, source, names, info, pageSource ? [pageSource] : []),
    ),
  ];
}

const formFiles = ({ s, p }: ResourceNames) => {
  const dir = `${FRONTEND}/app/(app)/${p.kebab}`;
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
    [files.form, (source: string) => syncFormComponent(files.form, source, fields)],
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

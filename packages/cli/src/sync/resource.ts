import { join } from 'node:path';
import type { Changes } from '../core/changes.ts';
import { formatSource } from '../core/format.ts';
import { resourceNames, type ResourceNames } from '../core/names.ts';
import { backendLib, CONTRACTS_SRC } from '../core/workspace.ts';
import { contractFile } from '../pieces/backend.ts';
import { readBody } from './body.ts';
import { childRoles, MESSAGE_KEY_IMPORT, OPTIONAL_DATE_HELPER, syncChildContract, syncContract, type SyncReport } from './contract.ts';
import { syncChildService, syncService } from './service.ts';
import { syncContractSpec, syncServiceSpec } from './service-spec.ts';
import { foreignRelations, readTable, tablesIn, type TableInfo } from './table.ts';

/*
 * Syncs a resource's contract with its table: the body schema, the list
 * query and the response types; then the service's queries and the sample
 * bodies of the specs. It edits, it doesn't regenerate (see sync/contract.ts).
 */

const TABLES = `${backendLib('database')}/src/tables`;
const tableFile = ({ p }: ResourceNames) => `${TABLES}/${p.kebab}.ts`;

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
    throw new Error(`${contractPath} not found: create it with "dafne g contract ${names.p.kebab}".`);

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
    const common = `${CONTRACTS_SRC}/common.ts`;
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
  const servicePath = `${backendLib(names.p.kebab)}/src/${names.p.kebab}.service.ts`;
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
  for (const file of changes.list(TABLES)) {
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

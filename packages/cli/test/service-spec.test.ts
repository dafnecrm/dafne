import { resourceNames } from '../src/core/names.ts';
import { syncContract } from '../src/sync/contract.ts';
import { readBody } from '../src/sync/body.ts';
import { syncContractSpec, syncServiceSpec } from '../src/sync/service-spec.ts';
import { readTable } from '../src/sync/table.ts';
import { renderBackend } from '../src/pieces/backend.ts';

const names = resourceNames('activity');
function fields(extra: string) {
  const table = readTable(
    'a.ts',
    renderBackend('table.ts', names).replace(
      "id: serial('id').primaryKey(),",
      `id: serial('id').primaryKey(),\n    name: varchar('name', { length: 255 }).notNull(),\n${extra}`,
    ),
    names,
  );
  const contract = syncContract('a.ts', renderBackend('contract.ts', names), names, table).content;
  return readBody('a.ts', contract, names, table);
}
/** The service spec of a resource generated with a `name` field (the template has none). */
function serviceSpec() {
  const samples = ["'Acme'", "'Acme Inc'", "'X'"];
  let n = 0;
  return renderBackend('service.spec.ts', names).replace(/body\(\{\}\)/g, () => `body({ name: ${samples[n++]} })`);
}

/** Its contract spec: a parse sample and a blank-name test. */
const contractSpec = () =>
  renderBackend('contract.spec.ts', names)
    .replace("failedFields({ deletedAt: '2026-01-01' })", "failedFields({ name: 'Acme', deletedAt: '2026-01-01' })")
    .replace('activityBodySchema.parse({})).toEqual({});', "activityBodySchema.parse({ name: '  Acme  ' })).toEqual({ name: 'Acme' });")
    .replace(
      "  it('rejects unknown properties",
      "  it('rejects a blank name', () => {\n    expect(failedFields({ name: '   ' })).toEqual(['name']);\n  });\n\n  it('rejects unknown properties",
    );

const REQUIRED = `
    type: text({ enum: ['email', 'phone'] }).notNull(),
    priority: integer('priority').notNull(),
    done: boolean('done').notNull(),
    budget: integer('budget'),
    status: text('status', { enum: ['open', 'done'] }).notNull().default('open'),`;

describe('syncServiceSpec', () => {
  it('adds the required fields to every body({...}), with sample values', () => {
    const { content, report } = syncServiceSpec('s.ts', serviceSpec(), fields(REQUIRED), new Set());
    expect(content).toContain("body({ name: 'Acme', type: 'email', priority: 1, done: false })");
    expect(content).toContain("body({ name: 'X', type: 'email', priority: 1, done: false })");
    // Optional or with a default: not needed.
    expect(content).not.toContain('budget:');
    expect(content).not.toContain('status:');
    expect(report.added).toEqual(['type', 'priority', 'done']);
  });

  it('drops fields that left the body', () => {
    const source = serviceSpec().replace("body({ name: 'Acme' })", "body({ name: 'Acme', code: 'A1' })");
    const { content, report } = syncServiceSpec('s.ts', source, fields(''), new Set(['code']));
    expect(content).toContain("body({ name: 'Acme' })");
    expect(report.removed).toEqual(['code']);
  });

  it('is idempotent', () => {
    const once = syncServiceSpec('s.ts', serviceSpec(), fields(REQUIRED), new Set()).content;
    expect(syncServiceSpec('s.ts', once, fields(REQUIRED), new Set()).content).toBe(once);
  });
});

describe('syncContractSpec', () => {
  it('completes parse/failedFields samples and the parsed result, keeping deliberate unknown keys', () => {
    const { content } = syncContractSpec('c.ts', contractSpec(), 'activityBodySchema', fields(REQUIRED), new Set());
    expect(content).toMatch(/activityBodySchema\.parse\(\{ name: ' {2}Acme {2}', type: 'email', priority: 1, done: false \}\)\)\.toEqual\(\{\s*name: 'Acme',\s*type: 'email',\s*priority: 1,\s*done: false,\s*budget: null,?\s*\}\)/);
    expect(content).toContain("failedFields({ name: '   ', type: 'email', priority: 1, done: false })");
    expect(content).toContain("deletedAt: '2026-01-01'");
  });

  it('adds the optional fields a sample leaves out to its parsed result, as null', () => {
    const { content } = syncContractSpec('c.ts', contractSpec(), 'activityBodySchema', fields(REQUIRED), new Set());
    // budget is nullable: parse returns null for it. status has a default: not null.
    expect(content).toMatch(/\.toEqual\(\{[^}]*budget: null/);
    expect(content).not.toMatch(/status: null/);
  });

  it('leaves samples with a spread, and fields that were already required, alone', () => {
    const source = contractSpec().replace("failedFields({ name: '   ' })", "failedFields({ ...base, name: '   ' })");
    // type was already required: a sample without it is deliberate.
    const { content, report } = syncContractSpec('c.ts', source, 'activityBodySchema', fields(REQUIRED), new Set(), new Set(['type']));
    expect(content).toContain("failedFields({ ...base, name: '   ' })");
    expect(content).not.toContain("type: 'email'");
    expect(report.added).toEqual(['priority', 'done', 'budget (null in the expected result)']);
  });
});

import { resourceNames } from '../src/core/names.js';
import { render } from '../src/core/templates.js';
import { syncContract } from '../src/sync/contract.js';
import { readBody } from '../src/sync/form.js';
import { syncContractSpec, syncServiceSpec } from '../src/sync/service-spec.js';
import { readTable } from '../src/sync/table.js';

const names = resourceNames('activity');
function fields(extra: string) {
  const table = readTable(
    'a.ts',
    render('backend/table.ts', names).replace(
      "name: varchar('name', { length: 255 }).notNull(),",
      `name: varchar('name', { length: 255 }).notNull(),\n${extra}`,
    ),
    names,
  );
  const contract = syncContract('a.ts', render('backend/contract.ts', names), names, table).content;
  return readBody('a.ts', contract, names, table);
}
const REQUIRED = `
    type: mysqlEnum(['email', 'phone']).notNull(),
    priority: int('priority').notNull(),
    done: boolean('done').notNull(),
    budget: int('budget'),
    status: mysqlEnum('status', ['open', 'done']).notNull().default('open'),`;

describe('syncServiceSpec', () => {
  it('adds the required fields to every body({...}), with sample values', () => {
    const { content, report } = syncServiceSpec('s.ts', render('backend/service.spec.ts', names), fields(REQUIRED), new Set());
    expect(content).toContain("body({ name: 'Acme', type: 'email', priority: 1, done: false })");
    expect(content).toContain("body({ name: 'X', type: 'email', priority: 1, done: false })");
    // Optional or with a default: not needed.
    expect(content).not.toContain('budget:');
    expect(content).not.toContain('status:');
    expect(report.added).toEqual(['type', 'priority', 'done']);
  });

  it('drops fields that left the body', () => {
    const source = render('backend/service.spec.ts', names).replace("body({ name: 'Acme' })", "body({ name: 'Acme', code: 'A1' })");
    const { content, report } = syncServiceSpec('s.ts', source, fields(''), new Set(['code']));
    expect(content).toContain("body({ name: 'Acme' })");
    expect(report.removed).toEqual(['code']);
  });

  it('is idempotent', () => {
    const once = syncServiceSpec('s.ts', render('backend/service.spec.ts', names), fields(REQUIRED), new Set()).content;
    expect(syncServiceSpec('s.ts', once, fields(REQUIRED), new Set()).content).toBe(once);
  });
});

describe('syncContractSpec', () => {
  it('completes parse/failedFields samples and the parsed result, keeping deliberate unknown keys', () => {
    const { content } = syncContractSpec('c.ts', render('backend/contract.spec.ts', names), 'activityBodySchema', fields(REQUIRED), new Set());
    expect(content).toMatch(/activityBodySchema\.parse\(\{ name: ' {2}Acme {2}', type: 'email', priority: 1, done: false \}\)\)\.toEqual\(\{\s*name: 'Acme',\s*type: 'email',\s*priority: 1,\s*done: false,?\s*\}\)/);
    expect(content).toContain("failedFields({ name: '   ', type: 'email', priority: 1, done: false })");
    expect(content).toContain("deletedAt: '2026-01-01'");
  });

  it('leaves samples with a spread, and fields that were already required, alone', () => {
    const source = render('backend/contract.spec.ts', names).replace("failedFields({ name: '   ' })", "failedFields({ ...base, name: '   ' })");
    // type was already required: a sample without it is deliberate.
    const { content, report } = syncContractSpec('c.ts', source, 'activityBodySchema', fields(REQUIRED), new Set(), new Set(['type']));
    expect(content).toContain("failedFields({ ...base, name: '   ' })");
    expect(content).not.toContain("type: 'email'");
    expect(report.added).toEqual(['priority', 'done']);
  });
});

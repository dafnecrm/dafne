import { resourceNames } from '../src/core/names.ts';
import { render } from '../src/core/templates.ts';
import { syncService } from '../src/sync/service.ts';
import { readTable } from '../src/sync/table.ts';

const names = resourceNames('activity');
const tableWith = (extra: string) =>
  readTable(
    'activities.ts',
    render('backend/table.ts', names).replace(
      "name: varchar('name', { length: 255 }).notNull(),",
      `name: varchar('name', { length: 255 }).notNull(),\n${extra}`,
    ),
    names,
  );
const service = () => render('backend/service.ts', names);

describe('syncService', () => {
  it('adds new columns to the list, the insert and the update, in table order', () => {
    const table = tableWith(`
    type: text({ enum: ['email', 'phone'] }).notNull(),
    /** @api readonly */
    status: text('status', { enum: ['open', 'done'] }).notNull().default('open'),`);
    const { content, report } = syncService('s.ts', service(), names, table);
    expect(content).toMatch(/name: activity\.name,\s*type: activity\.type,\s*status: activity\.status,\s*createdAt: activity\.createdAt/);
    expect(content).toMatch(/name: body\.name,\s*type: body\.type,\s*createdAt: now/);
    expect(content).toMatch(/\.set\(\{\s*name: body\.name,\s*type: body\.type,\s*updatedById: userId/);
    // readonly: in the list, not saved from the body.
    expect(content).not.toContain('status: body.status');
    expect(report.added).toContain('listActivities select: status');
  });

  it('leaves internal columns out of the detail and the list', () => {
    const table = tableWith(`
    /** @api internal */
    secret: varchar('secret', { length: 10 }),`);
    const { content } = syncService('s.ts', service(), names, table);
    expect(content).toMatch(/columns: \{\s*secret: false,\s*createdById: false,\s*updatedById: false\s*\}/);
    expect(content).not.toContain('secret: activity.secret');
    // Not in the contract, so not in the body either.
    expect(content).not.toContain('secret: body.secret');
  });

  it('removes dropped columns, but not hand-written values', () => {
    const table = tableWith(`    code: varchar('code', { length: 10 }),`);
    const once = syncService('s.ts', service(), names, table).content.replace(
      'updatedById: userId,\n        // The time',
      'updatedById: userId,\n        name2: body.name.toUpperCase(),\n        // The time',
    );
    const { content, report } = syncService('s.ts', once, names, tableWith(''), ['code']);
    expect(content).not.toContain('code: activity.code');
    expect(content).not.toContain('code: body.code');
    expect(content).toContain('name2: body.name.toUpperCase()');
    expect(report.removed).toEqual([
      'listActivities select: code',
      'createActivity insert values: code',
      'updateActivity update set: code',
    ]);
  });

  it('is idempotent', () => {
    const table = tableWith(`    type: text({ enum: ['email', 'phone'] }).notNull(),`);
    const once = syncService('s.ts', service(), names, table).content;
    const twice = syncService('s.ts', once, names, table);
    expect(twice.content).toBe(once);
    expect(twice.report.added).toEqual([]);
  });
});

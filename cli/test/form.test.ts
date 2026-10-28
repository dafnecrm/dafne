import { resourceNames } from '../src/core/names.js';
import { render } from '../src/core/templates.js';
import { syncContract } from '../src/sync/contract.js';
import { readBody, syncFormComponent, syncFormSchema } from '../src/sync/form.js';
import { readTable } from '../src/sync/table.js';

const names = resourceNames('activity');
const COLUMNS = `
    type: mysqlEnum(['email', 'phone']).notNull(),
    priority: int('priority').default(1).notNull(),
    budget: int('budget'),
    done: boolean('done').notNull(),
    dueDate: date('due_date'),
    startsAt: timestamp('starts_at', { fsp: 3 }),
    customerId: varchar('customer_id', { length: 36 }),`;

/** Contract synced from a table with more columns than the generated one. */
function setup() {
  const table = render('backend/table.ts', names).replace(
    "name: varchar('name', { length: 255 }).notNull(),",
    `name: varchar('name', { length: 255 }).notNull(),${COLUMNS}`,
  );
  const info = readTable('activities.ts', table, names);
  const contract = syncContract('activities.ts', render('backend/contract.ts', names), names, info).content;
  const fields = readBody('activities.ts', contract, names, info);
  const responseKeys = new Set(info.columns.map((c) => c.key));
  return { fields, responseKeys };
}

const view = { ...names, icon: 'FileIcon' };

describe('readBody', () => {
  it('maps contract fields to inputs', () => {
    const byKey = Object.fromEntries(setup().fields.map((f) => [f.key, f]));
    expect(byKey.name).toMatchObject({ kind: 'text', optional: false });
    expect(byKey.type).toMatchObject({ kind: 'enum', optional: false, enumType: 'ActivityType', values: ['email', 'phone'] });
    expect(byKey.priority).toMatchObject({ kind: 'number', optional: false, defaultValue: '1' });
    expect(byKey.budget).toMatchObject({ kind: 'number', optional: true });
    expect(byKey.done).toMatchObject({ kind: 'boolean', optional: false });
    expect(byKey.dueDate).toMatchObject({ kind: 'date', optional: true });
    expect(byKey.startsAt).toMatchObject({ kind: 'datetime', optional: true });
    expect(byKey.customerId).toMatchObject({ kind: 'text', optional: true });
  });
});

describe('syncFormSchema', () => {
  it('adds typed values, enum options and defaults, keeping the rest', () => {
    const { fields, responseKeys } = setup();
    const source = render('frontend/schema.ts', view).replace('name: activity?.name ?? ""', 'name: activity?.name ?? "Untitled"');
    const { content } = syncFormSchema('schema.ts', source, names, fields, responseKeys);
    expect(content).toContain('name: activity?.name ?? "Untitled"');
    expect(content).toMatch(/Record<Exclude<keyof ActivityBody, "type" \| "priority" \| "budget" \| "done">, string> & \{\s*type: ActivityType;\s*priority: number;\s*budget: number \| null;\s*done: boolean;\s*\}/);
    expect(content).toContain('export const TYPE_OPTIONS = [');
    expect(content).toContain('{ value: "phone", label: "Phone" }');
    expect(content).toMatch(/import \{[^}]*type ActivityType[^}]*\} from "@backend\/contracts"/);
    expect(content).toContain('priority: activity?.priority ?? 1');
    expect(content).toContain('budget: activity?.budget ?? null');
    expect(content).toContain('dueDate: activity?.dueDate?.slice(0, 10) ?? ""');
    expect(content).toContain('startsAt: activity?.startsAt?.slice(0, 16) ?? ""');
  });

  it('adds to an existing Exclude and type literal (users style)', () => {
    const { fields, responseKeys } = setup();
    const source = render('frontend/schema.ts', view).replace(
      'export type ActivityFormValues = Record<keyof ActivityBody, string>;',
      'export type ActivityFormValues = Record<Exclude<keyof ActivityBody, "type">, string> & {\n  /** Picked from a list. */\n  type: ActivityType;\n};',
    );
    const { content, report } = syncFormSchema('schema.ts', source, names, fields, responseKeys);
    expect(content).toContain('Exclude<keyof ActivityBody, "type" | "priority" | "budget" | "done">');
    expect(content).toContain('/** Picked from a list. */\n  type: ActivityType;');
    expect(report.added).not.toContain('ActivityFormValues: type');
  });

  it('is idempotent', () => {
    const { fields, responseKeys } = setup();
    const once = syncFormSchema('schema.ts', render('frontend/schema.ts', view), names, fields, responseKeys).content;
    const twice = syncFormSchema('schema.ts', once, names, fields, responseKeys);
    expect(twice.content).toBe(once);
    expect(twice.report.added).toEqual([]);
  });
});

describe('syncFormComponent', () => {
  it('adds the missing inputs after the last one, leaving the others alone', () => {
    const { fields } = setup();
    const source = render('frontend/form.tsx', view).replace('label="Name"', 'label="Title"');
    const { content, report } = syncFormComponent('form.tsx', source, fields);
    expect(content).toContain('label="Title"');
    expect(content).toContain('<field.SelectField label="Type" options={TYPE_OPTIONS} />');
    expect(content).toContain('<field.NumberField label="Priority" />');
    expect(content).toContain('<field.NumberField label="Budget (optional)" />');
    expect(content).toContain('<field.CheckboxField label="Done" />');
    expect(content).toContain('type="datetime-local"');
    expect(content).toMatch(/import \{[^}]*TYPE_OPTIONS[^}]*\} from "\.\/schema"/);
    expect(content.indexOf('name="name"')).toBeLessThan(content.indexOf('name="type"'));
    expect(report.added).toHaveLength(7);
  });

  it('skips fields marked dafne-ignore and fields already there', () => {
    const { fields } = setup();
    const source = render('frontend/form.tsx', view).replace(
      '<form.FormErrors />',
      '<form.FormErrors />\n          {/* dafne-ignore: customerId, budget */}',
    );
    const once = syncFormComponent('form.tsx', source, fields).content;
    expect(once).not.toContain('name="customerId"');
    expect(once).not.toContain('name="budget"');
    expect(syncFormComponent('form.tsx', once, fields).report.added).toEqual([]);
  });

  it('reports inputs whose field left the contract', () => {
    const { fields } = setup();
    const source = render('frontend/form.tsx', view).replace('name="name"', 'name="title"');
    expect(syncFormComponent('form.tsx', source, fields).report.stale).toEqual(['<form.AppField name="title">']);
  });
});

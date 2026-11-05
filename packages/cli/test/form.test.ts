import { resourceNames } from '../src/core/names.ts';
import { render } from '../src/core/templates.ts';
import { syncContract } from '../src/sync/contract.ts';
import { readBody } from '../src/sync/body.ts';
import { syncFormComponent, syncFormSchema } from '../src/sync/form.ts';
import { readTable } from '../src/sync/table.ts';

const names = resourceNames('activity');
const COLUMNS = `
    type: text({ enum: ['email', 'phone'] }).notNull(),
    priority: integer('priority').default(1).notNull(),
    budget: integer('budget'),
    done: boolean('done').notNull(),
    dueDate: date('due_date'),
    startsAt: timestamp('starts_at', { precision: 3, withTimezone: true }),
    customerId: varchar('customer_id', { length: 36 }),
    notes: text('notes'),
    /** @form editor */
    description: text('description'),`;

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
    expect(byKey.notes).toMatchObject({ kind: 'textarea', optional: true });
    expect(byKey.description).toMatchObject({ kind: 'editor', optional: true });
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
    expect(content).toContain('{ value: "phone", label: "activities.type.phone" }');
    expect(content).toMatch(/import \{[^}]*type ActivityType[^}]*\} from "@dafne\/contracts"/);
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
    const source = render('frontend/form.tsx', view).replace('label={t("activities.fields.name")}', 'label="Title"');
    const { content, report } = syncFormComponent('form.tsx', source, fields, names);
    expect(content).toContain('label="Title"');
    expect(content).toContain('<field.SelectField label={t("activities.fields.type")} options={typeOptions} />');
    expect(content).toContain('<field.NumberField label={t("activities.fields.priority")} />');
    expect(content).toContain('<field.NumberField label={t("activities.fields.budget")} />');
    expect(content).toContain('<field.CheckboxField label={t("activities.fields.done")} />');
    expect(content).toContain('<field.TextareaField label={t("activities.fields.notes")} />');
    expect(content).toContain('<field.TextEditorField label={t("activities.fields.description")} />');
    expect(content).toContain('<field.DatePickerField label={t("activities.fields.dueDate")} />');
    expect(content).toContain('<field.DateTimePickerField label={t("activities.fields.startsAt")} />');
    expect(content).toMatch(/import \{[^}]*TYPE_OPTIONS[^}]*\} from "\.\/schema"/);
    // Translated options are made at the top of the component, not in a render prop.
    expect(content).toContain('  const t = useTranslations();\n  const typeOptions = useOptionLabels(TYPE_OPTIONS);\n');
    expect(content).toMatch(/import \{ useOptionLabels \} from "@\/i18n\/options"/);
    expect(content.indexOf('name="name"')).toBeLessThan(content.indexOf('name="type"'));
    expect(report.added).toHaveLength(9);
  });

  it('skips fields marked dafne-ignore and fields already there', () => {
    const { fields } = setup();
    const source = render('frontend/form.tsx', view).replace(
      '<form.FormErrors />',
      '<form.FormErrors />\n          {/* dafne-ignore: customerId, budget */}',
    );
    const once = syncFormComponent('form.tsx', source, fields, names).content;
    expect(once).not.toContain('name="customerId"');
    expect(once).not.toContain('name="budget"');
    expect(syncFormComponent('form.tsx', once, fields, names).report.added).toEqual([]);
  });

  it('reports inputs whose field left the contract', () => {
    const { fields } = setup();
    const source = render('frontend/form.tsx', view).replace('name="name"', 'name="title"');
    expect(syncFormComponent('form.tsx', source, fields, names).report.stale).toEqual(['<form.AppField name="title">']);
  });
});

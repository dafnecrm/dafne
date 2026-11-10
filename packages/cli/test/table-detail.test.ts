import { resourceNames } from '../src/core/names.ts';
import { render } from '../src/core/templates.ts';
import { renderBackend } from '../src/pieces/backend.ts';
import { syncContract } from '../src/sync/contract.ts';
import { syncDetail } from '../src/sync/detail.ts';
import { syncColumns, syncEnumOptions, syncTableConfig } from '../src/sync/table-page.ts';
import { readResponse } from '../src/sync/response.ts';
import { readTable } from '../src/sync/table.ts';

const names = resourceNames('activity');
const view = { ...names, icon: 'FileIcon' };
const COLUMNS = `
    type: text({ enum: ['email', 'phone'] }).notNull(),
    budget: integer('budget'),
    done: boolean('done').notNull(),
    dueDate: date('due_date'),
    /** @api detail */
    notes: text('notes'),
    /** @api detail @form editor */
    description: text('description'),
    customerId: varchar('customer_id', { length: 36 }).references(() => customer.id),`;

function info(idTags = '') {
  const table = renderBackend('table.ts', names).replace(
    "id: serial('id').primaryKey(),",
    `${idTags}id: serial('id').primaryKey(),\n    name: varchar('name', { length: 255 }).notNull(),${COLUMNS}`,
  );
  const tableInfo = readTable('activities.ts', table, names);
  const contract = syncContract('activities.ts', renderBackend('contract.ts', names), names, tableInfo).content;
  return readResponse('activities.ts', contract, names, tableInfo);
}

describe('readResponse', () => {
  it('reads the list and detail fields with their kinds', () => {
    const { fields, sortFields, filterFields } = info();
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.type).toMatchObject({ kind: 'enum', listed: true, values: ['email', 'phone'] });
    expect(byKey.budget).toMatchObject({ kind: 'number', optional: true });
    expect(byKey.dueDate).toMatchObject({ kind: 'date' });
    expect(byKey.notes).toMatchObject({ kind: 'text', listed: false });
    expect(byKey.notes.richText).toBeUndefined();
    expect(byKey.description).toMatchObject({ kind: 'text', richText: true });
    expect(byKey.customerId).toMatchObject({ kind: 'id', label: 'Customer' });
    expect(sortFields).toContain('type');
    expect(filterFields).toEqual(['id', 'name', 'type', 'done', 'customerId']);
  });
});

describe('syncTableConfig', () => {
  it('adds sort fields in contract order, filters and enum labels', () => {
    const { content } = syncTableConfig('t.ts', render('frontend/lib-table.ts', view), names, info());
    expect(content).toContain('export const ACTIVITY_TYPE_OPTIONS = [');
    expect(content).toMatch(/sortable: \["id", "name", "type", "budget", "done", "dueDate", "createdAt", "updatedAt"\]/);
    expect(content).toMatch(/field: "type" satisfies ActivityFilterField,\s*label: "activities.fields.type",\s*options: ACTIVITY_TYPE_OPTIONS/);
    expect(content).toContain('{ value: "false", label: "common.no" }');
    expect(content).toContain('{ value: "phone", label: "activities.type.phone" }');
    expect(content).toMatch(/import \{ type MessageKey \} from "@dafne\/frontend-ui\/lib\/message-key"/);
  });

  it('keeps hand-made filters and honours dafne-ignore', () => {
    const source = render('frontend/lib-table.ts', view)
      .replace('filters: [],', 'filters: [{ field: "name" satisfies ActivityFilterField, label: "Title" }],')
      .replace('export const', '// dafne-ignore: done\nexport const');
    const { content } = syncTableConfig('t.ts', source, names, info());
    expect(content).toContain('label: "Title"');
    expect(content).not.toContain('field: "done"');
  });
});

describe('syncColumns', () => {
  it('adds the id first, as the link to the detail page', () => {
    const { content, report } = syncColumns('c.tsx', render('frontend/table.tsx', view), names, info());
    expect(content.indexOf('col.accessor("id"')).toBeLessThan(content.indexOf('col.accessor("name"'));
    expect(content).toMatch(/col\.accessor\("id", \{\s*header: t\("activities\.fields\.id"\),\s*cell: \(\{ row \}\) => \(\s*<Link\s+href=\{`\/activities\/\$\{encodeURIComponent\(row\.original\.id\)\}`\}/);
    expect(content).toContain('import Link from "next/link";');
    expect(report.added[0]).toBe('column id');
    expect(syncColumns('c.tsx', content, names, info()).report.added).toEqual([]);
  });

  it('leaves the id out when its @api tags keep it out of the list, and says what needs it', () => {
    const detailOnly = info('/** @api detail */\n    ');
    expect(detailOnly.fields.find((f) => f.key === 'id')?.listed).toBe(false);
    const { content, report } = syncColumns('c.tsx', render('frontend/table.tsx', view), names, detailOnly);
    expect(content).not.toContain('col.accessor("id"');
    expect(content).not.toContain('next/link');
    expect(report.warnings.join('\n')).toContain('ListedActivity has no id');
    // An id column already there goes with prune.
    const withId = syncColumns('c.tsx', render('frontend/table.tsx', view), names, info()).content;
    const pruned = syncColumns('c.tsx', withId, names, detailOnly, { prune: true });
    expect(pruned.content).not.toContain('col.accessor("id"');
    expect(pruned.report.removed).toContain('column id');
  });

  it('adds the listed fields before "Added", not ids or detail-only fields', () => {
    const { content, report } = syncColumns('c.tsx', render('frontend/table.tsx', view), names, info());
    expect(content.indexOf('col.accessor("type"')).toBeLessThan(content.indexOf('col.accessor("createdAt"'));
    expect(content).toContain('cell: (info) => optionLabel(ACTIVITY_TYPE_OPTIONS, info.getValue())');
    expect(content).toContain('header: t("activities.fields.type")');
    expect(content).toMatch(/import \{[^}]*ACTIVITY_TYPE_OPTIONS[^}]*\} from "@\/lib\/activities-table"/);
    expect(content).toContain('cell: (info) => info.getValue() ?? "—"');
    expect(content).not.toContain('"notes"');
    expect(content).not.toContain('"customerId"');
    expect(content).not.toContain('"updatedAt"');
    expect(report.warnings.join()).toMatch(/customerId: an id/);
  });

  it('writes keys relative to the namespace of useTranslations', () => {
    const source = render('frontend/table.tsx', view).replace('useTranslations()', 'useTranslations("activities.fields")')
      .replace('t("activities.fields.createdAt")', 't("createdAt")');
    const { content } = syncColumns('c.tsx', source, names, info());
    expect(content).toContain('header: t("id")');
    expect(content).toContain('header: t("type")');
    expect(content).not.toContain('t("activities.fields.');
  });

  it('keeps, with prune, a column of a listed member it has no kind for (an object)', () => {
    const table = renderBackend('table.ts', names);
    const tableInfo = readTable('activities.ts', table, names);
    const contract = syncContract('activities.ts', renderBackend('contract.ts', names), names, tableInfo).content.replace(
      /export interface ListedActivity \{/,
      'export interface ListedActivity {\n  customer: { id: number; name: string };',
    );
    const withCustomer = readResponse('activities.ts', contract, names, tableInfo);
    expect(withCustomer.listedSkipped).toContain('customer');
    const source = syncColumns('c.tsx', render('frontend/table.tsx', view), names, withCustomer).content.replace(
      'col.accessor("createdAt"',
      'col.accessor("customer", { cell: ({ row }) => row.original.customer.name }),\n        col.accessor("createdAt"',
    );
    const { content, report } = syncColumns('c.tsx', source, names, withCustomer, { prune: true });
    expect(content).toContain('col.accessor("customer"');
    expect(report.removed).toEqual([]);
  });

  it('is idempotent', () => {
    const once = syncColumns('c.tsx', render('frontend/table.tsx', view), names, info()).content;
    expect(syncColumns('c.tsx', once, names, info()).report.added).toEqual([]);
  });
});

describe('syncDetail', () => {
  it("doesn't add what the page shows (the title)", () => {
    // A page whose title is the name (the template's shows the id).
    const page = render('frontend/detail-page.tsx', view).replace(
      '{`${t("activities.singular")} ${activity.id}`}</PageContentTitle>',
      '{activity.name}</PageContentTitle>',
    );
    const { content } = syncDetail('d.tsx', render('frontend/detail.tsx', view), names, info(), [page]);
    expect(content).not.toContain('label={t("activities.fields.name")}');
    const alone = syncDetail('d.tsx', render('frontend/detail.tsx', view), names, info()).content;
    expect(alone).toContain('label={t("activities.fields.name")}');
  });

  it('adds a Details section before Record with the missing fields', () => {
    const { content } = syncDetail('p.tsx', render('frontend/detail.tsx', view), names, info());
    expect(content.indexOf('title={t("activities.sections.details")}')).toBeLessThan(content.indexOf('title={t("common.record.title")}'));
    expect(content).toMatch(/<Detail icon=\{TagIcon\} label=\{t\("activities.fields.type"\)\}>\s*\{optionLabel\(ACTIVITY_TYPE_OPTIONS, activity\.type\)\}/);
    expect(content).toContain('  const t = useTranslations();\n  const optionLabel = useOptionLabel();\n');
    expect(content).toMatch(/<Detail icon=\{TextIcon\} label=\{t\("activities.fields.notes"\)\}>\s*\{activity\.notes \?\? "—"\}/);
    expect(content).toContain('<LocalDate value={activity.dueDate} format="longDate" />');
    expect(content).toMatch(
      /<Detail icon=\{TextIcon\} label=\{t\("activities.fields.description"\)\} wide>\s*\{activity\.description \? \(?\s*<TextEditorContent\s+html=\{activity\.description\}/,
    );
    expect(content).toMatch(/import \{ TextEditorContent \} from "@dafne\/frontend-ui\/components\/text-editor"/);
    expect(content).not.toContain('activities.fields.deletedAt');
    expect(content).toMatch(/import \{[^}]*TagIcon[^}]*\} from "lucide-react"/);
  });

  it('adds to an existing Details section and skips fields the page reads', () => {
    const source = render('frontend/detail.tsx', view).replace(
      '<DetailSection title={t("common.record.title")}>',
      '<DetailSection title={t("activities.sections.details")}>\n          <p>{activity.type}</p>\n        </DetailSection>\n        <DetailSection title={t("common.record.title")}>',
    );
    const { content } = syncDetail('p.tsx', source, names, info());
    expect(content.match(/sections\.details/g)).toHaveLength(1);
    expect(content).not.toContain('label={t("activities.fields.type")}');
    expect(content).toContain('label={t("activities.fields.budget")}');
    expect(syncDetail('p.tsx', content, names, info()).report.added).toEqual([]);
  });
});

describe('syncEnumOptions', () => {
  it('adds the labels a detail page reads, once (no table page to add them)', () => {
    const type = info().fields.find((f) => f.key === 'type')!;
    const lib = 'import { defineDataTable } from "./data-table";\n\nexport const activitiesTable = defineDataTable({});\n';
    const { content, report } = syncEnumOptions('lib.ts', lib, names, [type]);
    expect(content.indexOf('export const ACTIVITY_TYPE_OPTIONS')).toBeLessThan(content.indexOf('activitiesTable'));
    expect(content).toContain('{ value: "phone", label: "activities.type.phone" }');
    expect(content).toMatch(/import \{ type ActivityType \} from "@dafne\/contracts"/);
    expect(report.added).toEqual(['ACTIVITY_TYPE_OPTIONS']);
    expect(syncEnumOptions('lib.ts', content, names, [type]).report.added).toEqual([]);
  });
});

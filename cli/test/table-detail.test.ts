import { resourceNames } from '../src/core/names.js';
import { render } from '../src/core/templates.js';
import { syncContract } from '../src/sync/contract.js';
import { syncDetail } from '../src/sync/detail.js';
import { syncColumns, syncTableConfig } from '../src/sync/table-page.js';
import { readResponse } from '../src/sync/response.js';
import { readTable } from '../src/sync/table.js';

const names = resourceNames('activity');
const view = { ...names, icon: 'FileIcon' };
const COLUMNS = `
    type: mysqlEnum(['email', 'phone']).notNull(),
    budget: int('budget'),
    done: boolean('done').notNull(),
    dueDate: date('due_date'),
    /** @api detail */
    notes: text('notes'),
    /** @api detail @form editor */
    description: text('description'),
    customerId: varchar('customer_id', { length: 36 }).references(() => customer.id),`;

function info() {
  const table = render('backend/table.ts', names).replace(
    "name: varchar('name', { length: 255 }).notNull(),",
    `name: varchar('name', { length: 255 }).notNull(),${COLUMNS}`,
  );
  const tableInfo = readTable('activities.ts', table, names);
  const contract = syncContract('activities.ts', render('backend/contract.ts', names), names, tableInfo).content;
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
    expect(filterFields).toEqual(['name', 'type', 'done']);
  });
});

describe('syncTableConfig', () => {
  it('adds sort fields in contract order, filters and enum labels', () => {
    const { content } = syncTableConfig('t.ts', render('frontend/lib-table.ts', view), names, info());
    expect(content).toContain('export const ACTIVITY_TYPE_OPTIONS = [');
    expect(content).toMatch(/sortable: \["name", "type", "budget", "done", "dueDate", "createdAt", "updatedAt"\]/);
    expect(content).toMatch(/field: "type" satisfies ActivityFilterField,\s*label: "Type",\s*placeholder: "Any type",\s*options: ACTIVITY_TYPE_OPTIONS/);
    expect(content).toContain('{ value: "false", label: "No" }');
  });

  it('keeps hand-made filters and honours dafne-ignore', () => {
    const source = render('frontend/lib-table.ts', view)
      .replace('label: "Name" }', 'label: "Title" }')
      .replace('export const', '// dafne-ignore: done\nexport const');
    const { content } = syncTableConfig('t.ts', source, names, info());
    expect(content).toContain('label: "Title"');
    expect(content).not.toContain('field: "done"');
  });
});

describe('syncColumns', () => {
  it('adds the listed fields before "Added", not ids or detail-only fields', () => {
    const { content, report } = syncColumns('c.tsx', render('frontend/table.tsx', view), names, info());
    expect(content.indexOf('col.accessor("type"')).toBeLessThan(content.indexOf('col.accessor("createdAt"'));
    expect(content).toContain('ACTIVITY_TYPE_OPTIONS.find((o) => o.value === info.getValue())?.label');
    expect(content).toMatch(/import \{[^}]*ACTIVITY_TYPE_OPTIONS[^}]*\} from "@\/lib\/activities-table"/);
    expect(content).toContain('cell: (info) => info.getValue() ?? "—"');
    expect(content).not.toContain('"notes"');
    expect(content).not.toContain('"customerId"');
    expect(content).not.toContain('"updatedAt"');
    expect(report.warnings.join()).toMatch(/customerId: an id/);
  });

  it('is idempotent', () => {
    const once = syncColumns('c.tsx', render('frontend/table.tsx', view), names, info()).content;
    expect(syncColumns('c.tsx', once, names, info()).report.added).toEqual([]);
  });
});

describe('syncDetail', () => {
  it("doesn't add what the page shows (the title)", () => {
    const page = render('frontend/detail-page.tsx', view);
    const { content } = syncDetail('d.tsx', render('frontend/detail.tsx', view), names, info(), [page]);
    expect(content).not.toContain('label="Name"');
    const alone = syncDetail('d.tsx', render('frontend/detail.tsx', view), names, info()).content;
    expect(alone).toContain('label="Name"');
  });

  it('adds a Details section before Record with the missing fields', () => {
    const { content } = syncDetail('p.tsx', render('frontend/detail.tsx', view), names, info());
    expect(content.indexOf('title="Details"')).toBeLessThan(content.indexOf('title="Record"'));
    expect(content).toMatch(/<Detail icon=\{TagIcon\} label="Type">/);
    expect(content).toMatch(/<Detail icon=\{TextIcon\} label="Notes">\s*\{activity\.notes \?\? "—"\}/);
    expect(content).toContain('<LocalDate value={activity.dueDate} format="longDate" />');
    expect(content).toMatch(
      /<Detail icon=\{TextIcon\} label="Description" wide>\s*\{activity\.description \? \(?\s*<TextEditorContent\s+html=\{activity\.description\}/,
    );
    expect(content).toMatch(/import \{ TextEditorContent \} from "@\/components\/ui\/text-editor"/);
    expect(content).not.toMatch(/label="Deleted at"/);
    expect(content).toMatch(/import \{[^}]*TagIcon[^}]*\} from "lucide-react"/);
  });

  it('adds to an existing Details section and skips fields the page reads', () => {
    const source = render('frontend/detail.tsx', view).replace(
      '<DetailSection title="Record">',
      '<DetailSection title="Details">\n          <p>{activity.type}</p>\n        </DetailSection>\n        <DetailSection title="Record">',
    );
    const { content } = syncDetail('p.tsx', source, names, info());
    expect(content.match(/title="Details"/g)).toHaveLength(1);
    expect(content).not.toContain('label="Type"');
    expect(content).toContain('label="Budget"');
    expect(syncDetail('p.tsx', content, names, info()).report.added).toEqual([]);
  });
});

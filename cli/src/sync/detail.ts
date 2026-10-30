import { Node, type SourceFile, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.js';
import { editSource, ensureNamedImport } from '../wiring/ast.js';
import type { FormReport as Report } from './form.js';
import { enumOptionsName, ignoredKeys, type ResponseField, type ResponseInfo } from './response.js';

/*
 * `sync detail`: a <Detail> for each response field the detail page
 * doesn't show, in its "Details" section (created before "Record" if
 * missing). A field counts as shown when the page reads `<record>.<field>`
 * anywhere. Nothing that's there changes.
 */

/** Shown by the generated "Record" section, or never shown. */
const NOT_SHOWN = new Set(['deletedAt']);

const ICONS: Record<ResponseField['kind'], string> = {
  text: 'TextIcon',
  id: 'LinkIcon',
  number: 'HashIcon',
  boolean: 'ToggleLeftIcon',
  enum: 'TagIcon',
  date: 'CalendarIcon',
  datetime: 'CalendarClockIcon',
};

function detailCode(names: ResourceNames, record: string, field: ResponseField): { code: string; imports: [string, string][] } {
  const value = `${record}.${field.key}`;
  const imports: [string, string][] = [['lucide-react', ICONS[field.kind]]];
  let body: string;
  if (field.richText) {
    // Sanitized HTML, on a row of its own: rich text needs the width.
    imports.push(['@/components/ui/text-editor', 'TextEditorContent']);
    const html = `<TextEditorContent html={${value}} className="w-full font-normal" />`;
    body = field.optional ? `{${value} ? ${html} : "—"}` : html;
    return {
      code: `<Detail icon={${ICONS[field.kind]}} label="${field.label}" className="col-span-full">\n  ${body}\n</Detail>`,
      imports,
    };
  }
  switch (field.kind) {
    case 'boolean':
      body = field.optional ? `{${value} === null ? "—" : ${value} ? "Yes" : "No"}` : `{${value} ? "Yes" : "No"}`;
      break;
    case 'enum': {
      const name = enumOptionsName(names, field);
      imports.push([`@/lib/${names.p.kebab}-table`, name]);
      body = `{${name}.find((o) => o.value === ${value})?.label ?? "—"}`;
      break;
    }
    case 'date':
    case 'datetime': {
      imports.push(['@/components/local-date', 'LocalDate']);
      const date = `<LocalDate value={${value}} format="${field.kind === 'date' ? 'longDate' : 'dateTime'}" />`;
      body = field.optional ? `{${value} ? ${date} : "—"}` : date;
      break;
    }
    case 'id':
      body = field.optional
        ? `{${value} ? <code className="font-mono text-xs">{${value}}</code> : "—"}`
        : `<code className="font-mono text-xs">{${value}}</code>`;
      break;
    default:
      body = field.optional ? `{${value} ?? "—"}` : `{${value}}`;
  }
  return { code: `<Detail icon={${ICONS[field.kind]}} label="${field.label}">\n  ${body}\n</Detail>`, imports };
}

const titleOf = (e: Node) => {
  if (!Node.isJsxElement(e)) return undefined;
  const attr = e.getOpeningElement().getAttribute('title');
  const init = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
  return init && Node.isStringLiteral(init) ? init.getLiteralValue() : undefined;
};

const sections = (file: SourceFile) =>
  file.getDescendantsOfKind(SyntaxKind.JsxElement).filter((e) => e.getOpeningElement().getTagNameNode().getText() === 'DetailSection');

function indentAt(file: SourceFile, pos: number) {
  const text = file.getFullText();
  return /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', pos - 1) + 1))![0];
}

/**
 * `alsoShownIn`: other files that show the record, e.g. the [id] page with
 * the title (`activity.name`); what they read isn't added again.
 */
export function syncDetail(
  path: string,
  source: string,
  names: ResourceNames,
  info: ResponseInfo,
  alsoShownIn: string[] = [],
): { content: string; report: Report } {
  const report: Report = { added: [], stale: [], warnings: [] };
  const record = names.s.camel;
  const ignored = ignoredKeys(source);
  if (!new RegExp(`\\b${record}\\.`).test(source)) {
    report.warnings.push(`${path}: the page doesn't read "${record}.…": add the fields by hand.`);
    return { content: source, report };
  }
  const shown = (text: string, key: string) => new RegExp(`\\b${record}\\??\\.${key}\\b`).test(text);
  const missing = info.fields.filter(
    (f) => !NOT_SHOWN.has(f.key) && !ignored.has(f.key) && ![source, ...alsoShownIn].some((text) => shown(text, f.key)),
  );

  const content = editSource(path, source, (file) => {
    for (const field of missing) {
      const { code, imports } = detailCode(names, record, field);
      const details = sections(file).find((e) => titleOf(e) === 'Details');
      if (details) {
        // Last in the section.
        const closing = details.getClosingElement();
        const indent = indentAt(file, closing.getStart());
        file.insertText(closing.getStart(), `  ${code.replace(/\n/g, `\n${indent}  `)}\n${indent}`);
      } else {
        const anchor = sections(file).find((e) => titleOf(e) === 'Record') ?? sections(file)[0];
        if (!anchor) {
          report.warnings.push(`${path}: no <DetailSection> to put ${field.key} in; add it by hand.`);
          continue;
        }
        const indent = indentAt(file, anchor.getStart());
        const section = `<DetailSection title="Details">\n  ${code.replace(/\n/g, '\n  ')}\n</DetailSection>`;
        file.insertText(anchor.getStart(), `${section.replace(/\n/g, `\n${indent}`)}\n${indent}`);
      }
      for (const [module, name] of imports) ensureNamedImport(file, module, name);
      report.added.push(`<Detail> ${field.key}`);
    }
  });

  // Fields the page reads that the contract doesn't have any more.
  const known = new Set([...info.fields.map((f) => f.key), ...info.skipped]);
  for (const m of new Set([...content.matchAll(new RegExp(`\\b${record}\\??\\.(\\w+)`, 'g'))].map((m) => m[1])))
    if (!known.has(m)) report.stale.push(`${record}.${m}`);
  return { content, report };
}

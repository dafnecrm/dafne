import { Node, type SourceFile, SyntaxKind } from 'ts-morph';
import type { ResourceNames } from '../core/names.ts';
import { editSource, ensureHookLine, ensureNamedImport, removeJsxElement, removeUnusedImports } from '../wiring/ast.ts';
import type { FormReport as Report } from './form.ts';
import { enumOptionsName, ignoredKeys, type ResponseField, type ResponseInfo } from './response.ts';

/*
 * `sync frontend detail`: a <Detail> for each response field the detail page
 * doesn't show, in its "Details" section (created before "Record" if
 * missing). A field counts as shown when the page reads `<record>.<field>`
 * anywhere. Nothing that's there changes, unless `prune`: then the <Detail>s
 * that read a field the contract dropped go too. Labels are message keys
 * (`<plural>.fields.<key>`), translated with the page's `t`.
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
  const label = `{t("${names.p.camel}.fields.${field.key}")}`;
  const imports: [string, string][] = [['lucide-react', ICONS[field.kind]]];
  let body: string;
  if (field.richText) {
    // Sanitized HTML, on a row of its own: rich text needs the width.
    imports.push(['@dafne/frontend-ui/components/text-editor', 'TextEditorContent']);
    const html = `<TextEditorContent html={${value}} className="font-normal" />`;
    body = field.optional ? `{${value} ? ${html} : "—"}` : html;
    return {
      code: `<Detail icon={${ICONS[field.kind]}} label=${label} wide>\n  ${body}\n</Detail>`,
      imports,
    };
  }
  switch (field.kind) {
    case 'boolean':
      body = field.optional
        ? `{${value} === null ? "—" : t(${value} ? "common.yes" : "common.no")}`
        : `{t(${value} ? "common.yes" : "common.no")}`;
      break;
    case 'enum': {
      const name = enumOptionsName(names, field);
      imports.push([`@/lib/${names.p.kebab}-table`, name]);
      body = `{optionLabel(${name}, ${value})}`;
      break;
    }
    case 'date':
    case 'datetime': {
      imports.push(['@dafne/frontend-ui/components/local-date', 'LocalDate']);
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
  return { code: `<Detail icon={${ICONS[field.kind]}} label=${label}>\n  ${body}\n</Detail>`, imports };
}

/** "Details" or "Record": a section's title, as text or as its message key. */
const titleOf = (e: Node) => {
  if (!Node.isJsxElement(e)) return undefined;
  const attr = e.getOpeningElement().getAttribute('title');
  const init = attr && Node.isJsxAttribute(attr) ? attr.getInitializer() : undefined;
  if (init && Node.isStringLiteral(init)) return init.getLiteralValue();
  const key = init && /\bt\(\s*"([^"]+)"/.exec(init.getText())?.[1];
  if (key?.endsWith('.sections.details')) return 'Details';
  if (key === 'common.record.title') return 'Record';
  return undefined;
};

const sections = (file: SourceFile) =>
  file.getDescendantsOfKind(SyntaxKind.JsxElement).filter((e) => e.getOpeningElement().getTagNameNode().getText() === 'DetailSection');

function indentAt(file: SourceFile, pos: number) {
  const text = file.getFullText();
  return /^[ \t]*/.exec(text.slice(text.lastIndexOf('\n', pos - 1) + 1))![0];
}

/**
 * `alsoShownIn`: other files that show the record, e.g. the [id] page with
 * the title (`activity.id`, or a field the user put there); what they read
 * isn't added again.
 */
export function syncDetail(
  path: string,
  source: string,
  names: ResourceNames,
  info: ResponseInfo,
  alsoShownIn: string[] = [],
  { prune = false }: { prune?: boolean } = {},
): { content: string; report: Report } {
  const report: Report = { added: [], removed: [], stale: [], warnings: [] };
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

  const known = new Set([...info.fields.map((f) => f.key), ...info.skipped]);
  const reads = (text: string) => new Set([...text.matchAll(new RegExp(`\\b${record}\\??\\.(\\w+)`, 'g'))].map((m) => m[1]));
  const content = editSource(path, source, (file) => {
    if (prune) {
      const goneIn = (e: Node) => [...reads(e.getText())].filter((key) => !known.has(key));
      // Looked up again after each removal: editing the text forgets the old nodes.
      const next = () =>
        file
          .getDescendantsOfKind(SyntaxKind.JsxElement)
          .find((e) => e.getOpeningElement().getTagNameNode().getText() === 'Detail' && goneIn(e).length);
      for (let detail = next(); detail; detail = next()) {
        report.removed!.push(`<Detail> ${goneIn(detail).join(', ')}`);
        removeJsxElement(file, detail);
      }
      // The enum-label hook, icons and helpers only the removed details used.
      const hook = file
        .getDescendantsOfKind(SyntaxKind.VariableStatement)
        .find((st) => st.getDeclarations()[0]?.getInitializer()?.getText() === 'useOptionLabel()');
      if (report.removed!.length && hook && !/\boptionLabel\(/.test(file.getFullText())) hook.remove();
      if (report.removed!.length)
        removeUnusedImports(file, (module) => module === 'lucide-react' || module.startsWith('@dafne/frontend-ui/') || module.startsWith('@/lib/') || module === '@/i18n/options');
    }
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
        const section = `<DetailSection title={t("${names.p.camel}.sections.details")}>\n  ${code.replace(/\n/g, '\n  ')}\n</DetailSection>`;
        file.insertText(anchor.getStart(), `${section.replace(/\n/g, `\n${indent}`)}\n${indent}`);
      }
      for (const [module, name] of imports) ensureNamedImport(file, module, name);
      if (field.kind === 'enum' && ensureHookLine(file, 'const optionLabel = useOptionLabel();'))
        ensureNamedImport(file, '@/i18n/options', 'useOptionLabel');
      report.added.push(`<Detail> ${field.key}`);
    }
  });

  // Fields the page still reads that the contract doesn't have any more.
  for (const m of reads(content)) if (!known.has(m)) report.stale.push(`${record}.${m}`);
  return { content, report };
}

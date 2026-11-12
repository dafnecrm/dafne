import { Node, SyntaxKind, type SourceFile } from 'ts-morph';
import type { Changes } from '../core/changes.ts';
import { actionFiles, componentsDir, dataFiles, findFrontendTarget, type FrontendTarget } from '../core/frontend-target.ts';
import type { ResourceNames } from '../core/names.ts';
import { render } from '../core/templates.ts';
import { DEFAULT_FRONTEND_APP } from '../core/workspace.ts';
import { appendToList, editSource, ensureNamedImport, insertImportLine } from '../wiring/ast.ts';
import { loggedFields } from '../wiring/changelog.ts';
import { hasChangelogFrontend, wireChangelogFrontend } from '../wiring/frontend.ts';

/*
 * The history of a logged resource, added to pages that exist already
 * (`frontend-resource` writes it with the pages): when its change log is
 * turned on later (`backend-changelog`) or the pages predate it (`sync
 * frontend-resource`). Each step is skipped when done already.
 */

const CHANGELOG_PACKAGE = '@dafne/frontend-changelog';

/** The files of a resource's history: its sheet and the menu that opens it. */
export function historyFiles(names: ResourceNames, target: FrontendTarget) {
  const dir = componentsDir(names, target);
  return {
    sheet: `${dir}/${names.s.kebab}-changelog.tsx`,
    detailActions: `${dir}/${names.s.kebab}-detail-actions.tsx`,
  };
}

/** How a file imports a sibling: "./x" in the app, "./x.tsx" in a lib. */
const sibling = (target: FrontendTarget, name: string, ext: string) =>
  target.kind === 'app' ? `./${name}` : `./${name}${ext}`;

/** The line the sheet names a field with. */
const fieldLine = ({ p }: ResourceNames, field: string) => `${field}: { label: t("${p.camel}.fields.${field}") }`;

/**
 * Adds the history to a resource's existing pages (idempotent): the
 * fetcher (data), the server action (actions), the sheet
 * (`<singular>-changelog.tsx`, naming `fields`), the History item of the
 * detail actions, and the changelog lib's wiring. Needs the detail page:
 * without its actions menu, nothing is added. Returns what it added; warns
 * about what it couldn't place.
 */
export function addHistory(changes: Changes, names: ResourceNames, target: FrontendTarget, fields: string[]): string[] {
  const { s } = names;
  const files = historyFiles(names, target);
  if (!changes.exists(files.detailActions)) {
    return [];
  }
  const added: string[] = [];
  const data = { ...names, changelog: fields };

  // The fetcher, next to the other reads.
  const { lib } = dataFiles(names, target);
  const fetcher = `list${s.pascal}Changes`;
  if (changes.exists(lib) && !(changes.read(lib) ?? '').includes(fetcher)) {
    changes.update(lib, (source) =>
      editSource(lib, source, (file) => {
        ensureTypeImport(file, CHANGELOG_PACKAGE, 'ChangesPage');
        if (target.kind === 'lib') {
          ensureTypeImport(file, './types.ts', `${s.pascal}Detail`);
        }
        appendCode(file, render('frontend/partials/changes-fetcher.ts', data));
      }),
    );
    added.push(`${lib}: ${fetcher}`);
  }

  // The server action the sheet calls.
  const { actions } = actionFiles(names, target);
  const action = `get${s.pascal}Changes`;
  const actionsSource = changes.read(actions) ?? '';
  if (actionsSource && !actionsSource.includes(action)) {
    if (!/\bfunction errorMessage\b/.test(actionsSource) || !/\bActionError\b/.test(actionsSource)) {
      changes.warn(`${actions}: no errorMessage or ActionError (as the generated actions have): add ${action} by hand.`);
    } else {
      changes.update(actions, (source) =>
        editSource(actions, source, (file) => {
          ensureNamedImport(file, target.kind === 'app' ? `@/lib/${names.p.kebab}` : './server.ts', fetcher);
          ensureTypeImport(file, CHANGELOG_PACKAGE, 'ChangesPage');
          appendCode(file, render('frontend/partials/changes-action.ts', data));
        }),
      );
      added.push(`${actions}: ${action}`);
    }
  }

  // The sheet.
  if (!changes.exists(files.sheet)) {
    const template = target.kind === 'app' ? 'frontend/changelog.tsx' : 'frontend-lib-resource/components/changelog.tsx';
    changes.create(files.sheet, render(template, data));
    added.push(files.sheet);
  }

  // The menu item that opens it.
  if (addHistoryItem(changes, names, target, files.detailActions)) {
    added.push(`${files.detailActions}: History`);
  }

  wireChangelogFrontend(changes, target);
  return added;
}

/** `import type { name } from "module"`, or `name` added to the module's import. */
function ensureTypeImport(file: SourceFile, module: string, name: string) {
  if (file.getImportDeclaration((d) => d.getModuleSpecifierValue() === module)) {
    ensureNamedImport(file, module, name, { typeOnly: true });
  } else {
    insertImportLine(file, `type { ${name} }`, module);
  }
}

/** Appends code at the end of a file, after a blank line. */
function appendCode(file: SourceFile, code: string) {
  const text = file.getFullText();
  const end = text.replace(/\s*$/, '').length;
  file.replaceText([end, text.length], `\n\n${code.trim()}\n`);
}

/**
 * The History item in the detail actions (after Edit), its state and the
 * sheet (after the menu). False when it's there already or the menu isn't
 * as generated (with a warning).
 */
function addHistoryItem(changes: Changes, names: ResourceNames, target: FrontendTarget, path: string): boolean {
  const { s } = names;
  const sheet = `${s.pascal}ChangelogSheet`;
  const source = changes.read(path) ?? '';
  if (source.includes(sheet)) {
    return false;
  }
  let placed = true;
  const updated = editSource(path, source, (file) => {
    const state = /\n([ \t]*)const \[deleting, setDeleting\] = useState\(false\);?\n/.exec(file.getFullText());
    const edit = () =>
      file
        .getDescendantsOfKind(SyntaxKind.JsxElement)
        .find((el) => el.getOpeningElement().getTagNameNode().getText() === 'DropdownMenuItem' && EDIT_ITEM.test(el.getText()));
    const menu = () =>
      file.getDescendantsOfKind(SyntaxKind.JsxElement).find((el) => el.getOpeningElement().getTagNameNode().getText() === 'DropdownMenu');
    if (!state || !edit() || !menu()) {
      placed = false;
      return;
    }
    // From the end of the file up, so the earlier positions still hold.
    const menuEl = menu()!;
    const menuIndent = lineIndent(file, menuEl.getStart());
    file.insertText(
      menuEl.getEnd(),
      `\n${menuIndent}<${sheet}\n${menuIndent}  ${s.camel}Id={${s.camel}.id}\n${menuIndent}  open={history}\n${menuIndent}  onOpenChange={setHistory}\n${menuIndent}/>`,
    );
    // `t` scoped to a namespace (`useTranslations("common")`) can't read
    // changelog.open: a translator of the changelog's texts then.
    const translator = /\n([ \t]*)const t = useTranslations\((?:\s*(["'])([^"']*)\2\s*)?\);?\n/.exec(file.getFullText());
    const scoped = Boolean(translator?.[3]);
    const label = scoped ? 'tChangelog("open")' : 't("changelog.open")';
    const editEl = edit()!;
    const itemIndent = lineIndent(file, editEl.getStart());
    file.insertText(
      editEl.getEnd(),
      `\n${itemIndent}<DropdownMenuItem onClick={() => setHistory(true)}>\n${itemIndent}  <HistoryIcon />\n${itemIndent}  {${label}}\n${itemIndent}</DropdownMenuItem>`,
    );
    if (scoped) {
      const at = /\n([ \t]*)const t = useTranslations\([^)]*\);?\n/.exec(file.getFullText())!;
      file.insertText(at.index + at[0].length, `${at[1]}const tChangelog = useTranslations("changelog");\n`);
    } else if (!translator) {
      changes.warn(`${path}: no \`const t = useTranslations(…)\`: the History item reads t("changelog.open"), declare it.`);
    }
    const at = /\n([ \t]*)const \[deleting, setDeleting\] = useState\(false\);?\n/.exec(file.getFullText())!;
    file.insertText(at.index + at[0].length, `${at[1]}const [history, setHistory] = useState(false);\n`);
    ensureNamedImport(file, 'lucide-react', 'HistoryIcon');
    if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === sibling(target, `${s.kebab}-changelog`, '.tsx'))) {
      insertImportLine(file, `{ ${sheet} }`, sibling(target, `${s.kebab}-changelog`, '.tsx'));
    }
  });
  if (!placed) {
    changes.warn(
      `${path}: no Edit item, delete state or menu as generated: open ${sheet} (${sibling(target, `${s.kebab}-changelog`, '.tsx')}) from the menu by hand.`,
    );
    return false;
  }
  changes.update(path, () => updated);
  return true;
}

/** The Edit item of a detail menu: its text (`t("common.edit")`, `t("edit")`) or its link (`…/edit`). */
const EDIT_ITEM = /\bt\(\s*["'](?:common\.)?edit["']\s*\)|\/edit\b/;

/** Whitespace at the start of the line holding `pos`. */
function lineIndent(file: SourceFile, pos: number) {
  const text = file.getFullText();
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
  return /^[ \t]*/.exec(text.slice(lineStart))![0];
}

/**
 * Adds the logged fields the sheet doesn't name yet to its `fields`
 * (idempotent; the fields it names otherwise stay). Returns those added.
 */
export function syncHistoryFields(changes: Changes, names: ResourceNames, target: FrontendTarget, fields: string[]): string[] {
  const { sheet } = historyFiles(names, target);
  const source = changes.read(sheet);
  if (!source) {
    return [];
  }
  let added: string[] = [];
  const updated = editSource(sheet, source, (file) => {
    const object = () =>
      file
        .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .find((v) => v.getName() === 'fields')
        ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
    const current = object();
    if (!current) {
      return void changes.warn(`${sheet}: no \`const fields = { … }\`: name the logged fields there by hand.`);
    }
    const named = new Set(current.getProperties().map((prop) => (Node.isPropertyAssignment(prop) ? prop.getName() : '')));
    added = fields.filter((field) => !named.has(field));
    if (!added.length) {
      return;
    }
    // The labels are translated: `t` from useTranslations(), before `fields`.
    if (!/\bconst t = useTranslations\(/.test(file.getFullText())) {
      const statement = current.getFirstAncestorByKind(SyntaxKind.VariableStatement)!;
      file.insertText(statement.getStart(), `const t = useTranslations();\n${lineIndent(file, statement.getStart())}`);
      ensureNamedImport(file, 'next-intl', 'useTranslations');
    }
    for (const field of added) {
      const fresh = object()!;
      const properties = fresh.getProperties();
      if (properties.length) {
        appendToList(file, fresh, properties, fieldLine(names, field));
      } else {
        const indent = lineIndent(file, fresh.getStart());
        fresh.replaceWithText(`{\n${indent}  ${fieldLine(names, field)},\n${indent}}`);
      }
    }
  });
  if (added.length) {
    changes.update(sheet, () => updated);
  }
  return added;
}

/**
 * The history of a logged resource's existing pages, in `target` (by
 * default where its frontend is in apps/<app>): `addHistory`, then the
 * sheet's fields in line with the log's (`syncHistoryFields`). Nothing when
 * the resource keeps no change log, has no pages, or the workspace has no
 * changelog lib (warned). Returns what was added, as "path: what".
 */
export function historyOfPages(
  changes: Changes,
  names: ResourceNames,
  { app = DEFAULT_FRONTEND_APP, target }: { app?: string; target?: FrontendTarget } = {},
): string[] {
  const where = target ?? findFrontendTarget(changes, names, app);
  const fields = where ? loggedFields(changes, names) : undefined;
  if (!where || !fields || !changes.exists(historyFiles(names, where).detailActions) || !hasChangelogFrontend(changes)) {
    return [];
  }
  const added = addHistory(changes, names, where, fields);
  const { sheet } = historyFiles(names, where);
  return [...added, ...syncHistoryFields(changes, names, where, fields).map((field) => `${sheet}: ${field}`)];
}

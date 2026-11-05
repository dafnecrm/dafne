import { applyEdits, modify, parse } from 'jsonc-parser';
import { Node, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';
import type { Changes } from '../core/changes.ts';
import { casings, words } from '../core/names.ts';
import { frontendApp, frontendLib, frontendPackage } from '../core/workspace.ts';
import {
  arrayProperty,
  editSource,
  ensureArrayElement,
  ensureNamedImport,
  insertArrayElement,
  quoteOf,
  variableObject,
} from './ast.ts';
import { ensureDependency, ensureReference } from './backend.ts';
import { ensureFrontendMessages } from './messages.ts';

export const nextConfig = (app: string) => `${frontendApp(app)}/next.config.ts`;
export const frontendTsconfig = (app: string) => `${frontendApp(app)}/tsconfig.json`;
export const navigation = (app: string) => `${frontendApp(app)}/lib/navigation.ts`;

const JSON_FORMAT = { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } };

/**
 * Registers a frontend lib in apps/<app>: its dependency, Next's
 * `transpilePackages` (it ships sources), `nx.sync.ignoredDependencies` in
 * the app's tsconfig (Next compiles the sources, no project references) and
 * the root's project reference, as `nx sync` would write it. The new
 * package still needs `pnpm install` to be linked.
 */
export function wireFrontendLib(changes: Changes, lib: string, app: string) {
  const name = frontendPackage(lib);
  ensureDependency(changes, `${frontendApp(app)}/package.json`, name, 'workspace:*');

  const config = nextConfig(app);
  changes.update(config, (source) =>
    editSource(config, source, (file) => {
      const q = quoteOf(file);
      const object = () => variableObject(file, 'nextConfig');
      ensureArrayElement(file, arrayProperty(file, object, 'transpilePackages'), `${q}${name}${q}`);
    }),
  );

  changes.update(frontendTsconfig(app), (source) => ensureIgnoredDependency(source, name));
  ensureReference(changes, 'tsconfig.json', `./${frontendLib(lib)}`);
}

/** Adds `name` to `nx.sync.ignoredDependencies` of a tsconfig, unless it's there. */
function ensureIgnoredDependency(source: string, name: string) {
  const path = ['nx', 'sync', 'ignoredDependencies'];
  const current = (parse(source) as { nx?: { sync?: { ignoredDependencies?: string[] } } }).nx?.sync
    ?.ignoredDependencies;
  if (current?.includes(name)) return source;
  const edits = current
    ? modify(source, [...path, current.length], name, { ...JSON_FORMAT, isArrayInsertion: true })
    : modify(source, path, [name], JSON_FORMAT);
  return applyEdits(source, edits);
}

export interface NavEntry {
  /** The link's text, e.g. "Invoices"; its key in the `nav` messages is "invoices". */
  title: string;
  href: string;
  /** A lucide-react icon, e.g. "FileIcon". */
  icon: string;
  /** Sidebar section, e.g. "CRM" (key "crm"); created (before Admin/Account) if missing. */
  section: string;
  /** Marks a new section as admin-only. */
  adminOnly?: boolean;
}

function stringProperty(object: ObjectLiteralExpression, name: string) {
  const prop = object.getProperty(name);
  if (!prop || !Node.isPropertyAssignment(prop)) return undefined;
  const init = prop.getInitializer();
  return init && Node.isStringLiteral(init) ? init.getLiteralValue() : undefined;
}

/** The key of a nav title in the `nav` messages: "Audit log" → "auditLog". */
export const navKey = (title: string) => casings(words(title)).camel;

/**
 * Adds a sidebar link to apps/<app>/lib/navigation.ts, unless one with the
 * same href exists. Titles there are keys of the `nav` messages, whose
 * texts are added to the app's messages if missing.
 */
export function wireNav(changes: Changes, app: string, entry: NavEntry) {
  const titleKey = navKey(entry.title);
  const sectionKey = navKey(entry.section);
  ensureFrontendMessages(
    changes,
    new Map([
      [`nav.${titleKey}`, entry.title],
      [`nav.${sectionKey}`, entry.section],
    ]),
    app,
  );
  const path = navigation(app);
  changes.update(path, (source) =>
    editSource(path, source, (file) => {
      const sectionsArray = () =>
        file
          .getVariableDeclarationOrThrow('NAV_SECTIONS')
          .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);
      const sections = () =>
        sectionsArray()
          .getElements()
          .filter((e): e is ObjectLiteralExpression => Node.isObjectLiteralExpression(e));

      const linked = sections().some((section) =>
        section
          .getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
          .some((item) => stringProperty(item, 'href') === entry.href && item !== section),
      );
      if (linked) return;

      ensureNamedImport(file, 'lucide-react', entry.icon);
      const item = `{ title: ${JSON.stringify(titleKey)}, href: ${JSON.stringify(entry.href)}, icon: ${entry.icon} }`;

      const section = sections().find((s) => stringProperty(s, 'title') === sectionKey);
      if (section) {
        const items = section
          .getPropertyOrThrow('items')
          .asKindOrThrow(SyntaxKind.PropertyAssignment)
          .getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);
        ensureArrayElement(file, items, item);
        return;
      }

      const lines = [
        `title: ${JSON.stringify(sectionKey)}`,
        `href: ${JSON.stringify(entry.href)}`,
        ...(entry.adminOnly ? ['adminOnly: true'] : []),
        `items: [${item}]`,
      ];
      const list = sections();
      const before = list.findIndex((s) => ['admin', 'account'].includes(stringProperty(s, 'title') ?? ''));
      const index = before === -1 ? sectionsArray().getElements().length : before;
      // Prettier (the frontend's formatter) lays it out afterwards.
      insertArrayElement(file, sectionsArray(), index, `{ ${lines.join(', ')} }`);
    }),
  );
}

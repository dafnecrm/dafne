import { Node, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';
import type { Changes } from '../core/changes.js';
import { casings, words } from '../core/names.js';
import { editSource, ensureArrayElement, ensureNamedImport, insertArrayElement } from './ast.js';
import { ensureFrontendMessages } from './messages.js';

export const FRONTEND = 'frontend';
export const NAVIGATION = `${FRONTEND}/lib/navigation.ts`;

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
 * Adds a sidebar link to lib/navigation.ts, unless one with the same href
 * exists. Titles there are keys of the `nav` messages, whose texts are added
 * to frontend/messages if missing.
 */
export function wireNav(changes: Changes, entry: NavEntry) {
  const titleKey = navKey(entry.title);
  const sectionKey = navKey(entry.section);
  ensureFrontendMessages(
    changes,
    new Map([
      [`nav.${titleKey}`, entry.title],
      [`nav.${sectionKey}`, entry.section],
    ]),
  );
  changes.update(NAVIGATION, (source) =>
    editSource(NAVIGATION, source, (file) => {
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
      const before = list.findIndex((s) =>
        ['admin', 'account'].includes(stringProperty(s, 'title') ?? ''),
      );
      const index = before === -1 ? sectionsArray().getElements().length : before;
      // Prettier (the frontend's formatter) lays it out afterwards.
      insertArrayElement(file, sectionsArray(), index, `{ ${lines.join(', ')} }`);
    }),
  );
}

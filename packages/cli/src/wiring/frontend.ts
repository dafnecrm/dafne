import { applyEdits, modify, parse } from 'jsonc-parser';
import { Node, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';
import type { Changes } from '../core/changes.ts';
import { libMessagesDir, type FrontendTarget, type LibTarget } from '../core/frontend-target.ts';
import { casings, words, type ResourceNames } from '../core/names.ts';
import { render } from '../core/templates.ts';
import { frontendApp, frontendLib, frontendPackage } from '../core/workspace.ts';
import {
  appendToList,
  arrayProperty,
  editSource,
  ensureArrayElement,
  ensureNamedImport,
  insertArrayElement,
  insertImportLine,
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
  if (current?.includes(name)) {
    return source;
  }
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
  if (!prop || !Node.isPropertyAssignment(prop)) {
    return undefined;
  }
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
      if (linked) {
        return;
      }

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

/** The files of an empty frontend lib (templates/frontend-lib). */
const LIB_FILES = ['package.json', 'tsconfig.json', 'vitest.config.ts', 'eslint.config.mjs', 'src/index.ts'];

/**
 * An empty frontend lib, `@dafne/frontend-<lib>` in packages/frontend/<lib>
 * (`lib` already kebab-case), registered in apps/<app>.
 */
export function createFrontendLib(changes: Changes, lib: string, app: string) {
  const l = casings(words(lib));
  for (const file of LIB_FILES) {
    changes.create(`${frontendLib(l.kebab)}/${file}`, render(`frontend-lib/${file}`, { l }));
  }
  wireFrontendLib(changes, l.kebab, app);
}

/** What a lib's resource code imports: its package.json `dependencies`. */
const RESOURCE_DEPENDENCIES: Record<string, string> = {
  '@dafne/contracts': 'workspace:*',
  '@dafne/frontend-api': 'workspace:*',
  '@dafne/frontend-data-table': 'workspace:*',
  '@dafne/frontend-forms': 'workspace:*',
  '@dafne/frontend-ui': 'workspace:*',
  '@tanstack/react-form-nextjs': 'catalog:',
  'lucide-react': 'catalog:',
};

/** Sets `pkg[path]` in a package.json unless it's there (jsonc edits keep the file's layout). */
function ensureJsonValue(source: string, path: string[], value: string) {
  let node: unknown = parse(source);
  for (const part of path) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  if (node !== undefined) {
    return source;
  }
  return applyEdits(source, modify(source, path, value, JSON_FORMAT));
}

/**
 * Sets up a lib for a resource's frontend (packages/frontend/sales-orders
 * is the model): creates the lib if missing and registers it in the app,
 * then its package.json (exports, dependencies, next-intl), its entry point
 * (index.ts), its texts (messages/) and their place in the app's
 * next-intl messages (i18n/request.ts, i18n/global.d.ts). Idempotent.
 */
export function wireResourceLib(changes: Changes, names: ResourceNames, target: LibTarget) {
  const root = frontendLib(target.lib);
  if (!changes.exists(`${root}/package.json`)) {
    createFrontendLib(changes, target.lib, target.app);
  } else {
    wireFrontendLib(changes, target.lib, target.app);
  }

  const sub = target.sub;
  const src = `./${target.dir.slice(root.length + 1)}`;
  changes.update(`${root}/package.json`, (source) => {
    const exports: [string, string][] = [
      [sub ? `./${sub.slice(0, -1)}` : '.', `${src}/index.ts`],
      [`./${sub}actions`, `${src}/actions.ts`],
      [`./${sub}schema`, `${src}/schema.ts`],
      [`./${sub}server`, `${src}/server.ts`],
      [`./${sub}components/*`, `${src}/components/*.tsx`],
    ];
    for (const [key, value] of exports) {
      source = ensureJsonValue(source, ['exports', key], value);
    }
    for (const [name, version] of Object.entries(RESOURCE_DEPENDENCIES)) {
      source = ensureJsonValue(source, ['dependencies', name], version);
    }
    source = ensureJsonValue(source, ['peerDependencies', 'next-intl'], 'catalog:');
    return ensureJsonValue(source, ['devDependencies', 'next-intl'], 'catalog:');
  });

  // The entry point: plain data only (table config, texts, types).
  const index = `${target.dir}/index.ts`;
  const lines = [
    `export * from "./${names.p.kebab}-table.ts";`,
    'export * from "./messages/index.ts";',
    'export type * from "./types.ts";',
  ];
  if (!changes.exists(index)) {
    changes.create(index, render('frontend-lib-resource/index.ts', { ...names, pkg: target.pkg }));
  }
  changes.update(index, (source) => {
    source = source.replace(/^export \{\};\n?/m, '');
    const missing = lines.filter((line) => !source.includes(line));
    return missing.length ? `${source.replace(/\n*$/, '\n')}${missing.join('\n')}\n` : source;
  });

  const messages = libMessagesDir(target);
  for (const file of ['en.ts', 'it.ts', 'index.ts']) {
    if (!changes.exists(`${messages}/${file}`)) {
      changes.create(`${messages}/${file}`, render(`frontend-lib-resource/messages/${file}`, names));
    }
  }
  wireLibMessages(changes, names, target);
}

/** The app's next-intl setup. */
export const i18nRequest = (app: string) => `${frontendApp(app)}/i18n/request.ts`;
export const i18nTypes = (app: string) => `${frontendApp(app)}/i18n/global.d.ts`;

/**
 * Merges a lib's texts into the app's next-intl messages, under the
 * resource's namespace: `<ns>: <PLURAL>_MESSAGES[locale]` in
 * i18n/request.ts, `<ns>: <Plural>Messages` in the `Messages` type of
 * i18n/global.d.ts. Warns when a file isn't as expected.
 */
export function wireLibMessages(changes: Changes, { p }: ResourceNames, target: LibTarget) {
  wireMessages(changes, target.app, {
    ns: p.camel,
    value: `${p.constant}_MESSAGES`,
    type: `${p.pascal}Messages`,
    pkg: target.pkg,
  });
}

/** A lib's catalogs as an app merges them: `<ns>: <value>[locale]`, typed `<ns>: <type>`, both from `pkg`. */
export interface LibMessages {
  ns: string;
  value: string;
  type: string;
  pkg: string;
}

/**
 * Merges a lib's texts into apps/<app>'s next-intl messages (i18n/request.ts)
 * and their `Messages` type (i18n/global.d.ts), unless they're there. Warns
 * when a file isn't as expected.
 */
export function wireMessages(changes: Changes, app: string, { ns, value, type, pkg }: LibMessages) {
  const target = { app, pkg };
  const request = i18nRequest(target.app);
  if (!changes.exists(request)) {
    changes.warn(`${request} not found: merge ${value} (${target.pkg}) into the app's messages by hand.`);
  } else {
    changes.update(request, (source) =>
      editSource(request, source, (file) => {
        const object = () =>
          file
            .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
            .find((a) => a.getName() === 'messages' && Node.isObjectLiteralExpression(a.getInitializer()))
            ?.getInitializer() as ObjectLiteralExpression | undefined;
        const messages = object();
        if (!messages) {
          return void changes.warn(`${request}: no \`messages: { … }\`: merge ${value} by hand.`);
        }
        if (messages.getProperty(ns)) {
          return;
        }
        // The locale variable the other catalogs are indexed with.
        const locale =
          messages
            .getProperties()
            .map((prop) => /\[(\w+)\]$/.exec(prop.getText())?.[1])
            .find(Boolean) ?? 'locale';
        ensureNamedImport(file, target.pkg, value);
        const fresh = object()!;
        appendToList(file, fresh, fresh.getProperties(), `${ns}: ${value}[${locale}]`);
      }),
    );
  }

  const types = i18nTypes(target.app);
  if (!changes.exists(types)) {
    changes.warn(`${types} not found: add ${ns}: ${type} (${target.pkg}) to the app's Messages type by hand.`);
  } else {
    changes.update(types, (source) =>
      editSource(types, source, (file) => {
        const messages = () =>
          file
            .getDescendantsOfKind(SyntaxKind.PropertySignature)
            .find((prop) => prop.getName() === 'Messages' && prop.getFirstAncestorByKind(SyntaxKind.InterfaceDeclaration)?.getName() === 'AppConfig');
        const literal = () => messages()?.getTypeNode()?.getFirstDescendantByKind(SyntaxKind.TypeLiteral) ?? messages()?.getTypeNode()?.asKind(SyntaxKind.TypeLiteral);
        if (!messages()) {
          return void changes.warn(`${types}: no AppConfig.Messages: add ${ns}: ${type} by hand.`);
        }
        if (literal()?.getProperty(ns)) {
          return;
        }
        if (!file.getImportDeclaration((d) => d.getModuleSpecifierValue() === target.pkg)) {
          insertImportLine(file, `type { ${type} }`, target.pkg);
        } else {
          ensureNamedImport(file, target.pkg, type, { typeOnly: true });
        }
        const typeLiteral = literal();
        if (!typeLiteral) {
          const node = messages()!.getTypeNode()!;
          node.replaceWithText(`${node.getText()} & { ${ns}: ${type} }`);
          return;
        }
        const members = typeLiteral.getMembers();
        const last = members[members.length - 1];
        if (!last) {
          return void typeLiteral.replaceWithText(`{ ${ns}: ${type} }`);
        }
        const text = file.getFullText();
        const lineStart = text.lastIndexOf('\n', last.getStart() - 1) + 1;
        const indent = /^[ \t]*/.exec(text.slice(lineStart))![0];
        const semicolon = last.getText().trimEnd().endsWith(';') ? '' : ';';
        file.insertText(last.getEnd(), `${semicolon}\n${indent}${ns}: ${type};`);
      }),
    );
  }
}

/** The frontend's change log lib: the history sheet and its texts. */
export const CHANGELOG_FRONTEND_LIB = 'changelog';

/** Whether the workspace has @dafne/frontend-changelog; warns when it hasn't. */
export function hasChangelogFrontend(changes: Changes): boolean {
  const dir = frontendLib(CHANGELOG_FRONTEND_LIB);
  if (changes.exists(`${dir}/package.json`)) {
    return true;
  }
  changes.warn(`${dir} not found: the detail page gets no history (${frontendPackage(CHANGELOG_FRONTEND_LIB)} shows it).`);
  return false;
}

/**
 * Sets up the history of a resource's pages (idempotent):
 * @dafne/frontend-changelog registered in the app (as `wireFrontendLib`)
 * with its texts under `changelog`, and a dependency of the resource's lib
 * when the code is in one (its package.json must exist).
 */
export function wireChangelogFrontend(changes: Changes, target: FrontendTarget) {
  const pkg = frontendPackage(CHANGELOG_FRONTEND_LIB);
  wireFrontendLib(changes, CHANGELOG_FRONTEND_LIB, target.app);
  if (target.kind === 'lib') {
    ensureDependency(changes, `${frontendLib(target.lib)}/package.json`, pkg, 'workspace:*');
  }
  wireMessages(changes, target.app, { ns: 'changelog', value: 'CHANGELOG_MESSAGES', type: 'ChangelogMessages', pkg });
}

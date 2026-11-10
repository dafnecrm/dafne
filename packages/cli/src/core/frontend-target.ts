import type { Changes } from './changes.ts';
import { casings, words, type ResourceNames } from './names.ts';
import { DEFAULT_FRONTEND_APP, FRONTEND_LIBS, frontendApp, frontendLib, frontendPackage } from './workspace.ts';

/*
 * Where a resource's frontend lives. In the app: everything under
 * apps/<app> (lib/<plural>.ts, the route folder). In a lib (as
 * packages/frontend/sales-orders): data, actions and components in
 * packages/frontend/<lib>/src (or src/<plural> when the lib isn't named
 * after the resource), its texts in the lib's own catalogs; the route
 * pages and lib/<plural>-table.ts (the app's table) stay in the app.
 */

export interface AppTarget {
  kind: 'app';
  app: string;
}

export interface LibTarget {
  kind: 'lib';
  /** The app whose route pages show the resource. */
  app: string;
  /** The lib's folder name: packages/frontend/<lib>. */
  lib: string;
  /** The resource's sources: packages/frontend/<lib>/src, or …/src/<plural>. */
  dir: string;
  /** What the app imports: @dafne/frontend-<lib>, or …/<plural>. */
  pkg: string;
  /** The resource's sub-path in the lib's exports: "" or "<plural>/". */
  sub: string;
}

export type FrontendTarget = AppTarget | LibTarget;

export const appTarget = (app = DEFAULT_FRONTEND_APP): AppTarget => ({ kind: 'app', app });

/** A resource in packages/frontend/<lib>: in src when the lib is named after it, else in src/<plural>. */
export function libTarget(names: ResourceNames, lib: string, app = DEFAULT_FRONTEND_APP, nested = lib !== names.p.kebab): LibTarget {
  const kebab = names.p.kebab;
  return {
    kind: 'lib',
    app,
    lib,
    dir: nested ? `${frontendLib(lib)}/src/${kebab}` : `${frontendLib(lib)}/src`,
    pkg: nested ? `${frontendPackage(lib)}/${kebab}` : frontendPackage(lib),
    sub: nested ? `${kebab}/` : '',
  };
}

/** An app name stands for the app target. */
export const toTarget = (target: FrontendTarget | string): FrontendTarget =>
  typeof target === 'string' ? appTarget(target) : target;

/** A lib name as packages/frontend wants it: kebab-case, starting with a letter. */
export function libName(input: string): string {
  const parts = words(input);
  if (!parts.length || !/^[a-z]/.test(parts[0])) throw new Error(`"${input}" must start with a letter.`);
  return casings(parts).kebab;
}

/** The libs in packages/frontend (folders with a package.json). */
export function frontendLibs(changes: Changes): string[] {
  return changes
    .list(FRONTEND_LIBS)
    .filter((name) => changes.exists(`${frontendLib(name)}/package.json`))
    .sort();
}

/**
 * Where a resource's frontend already is: the app when it has
 * lib/<plural>.ts, a lib when one has <plural>-table.ts with
 * define<Plural>Table (in src or src/<plural>), else undefined.
 */
export function findFrontendTarget(changes: Changes, names: ResourceNames, app = DEFAULT_FRONTEND_APP): FrontendTarget | undefined {
  if (changes.exists(`${frontendApp(app)}/lib/${names.p.kebab}.ts`)) return appTarget(app);
  for (const lib of frontendLibs(changes))
    for (const nested of [false, true]) {
      const target = libTarget(names, lib, app, nested);
      const source = changes.read(`${target.dir}/${names.p.kebab}-table.ts`);
      if (source && new RegExp(`\\bfunction define${names.p.pascal}Table\\b`).test(source)) return target;
    }
  return undefined;
}

/** The folder of a resource's pages, e.g. apps/sales-web/app/[locale]/(app)/invoices: in the app either way. */
export const routeDir = ({ p }: ResourceNames, target: FrontendTarget | string) =>
  `${frontendApp(toTarget(target).app)}/app/[locale]/(app)/${p.kebab}`;

/** Where the components go: the route folder, or the lib's components/. */
export function componentsDir(names: ResourceNames, target: FrontendTarget | string) {
  const t = toTarget(target);
  return t.kind === 'app' ? routeDir(names, t) : `${t.dir}/components`;
}

/**
 * The data module: `lib` the backend reads (lib/<plural>.ts, or the lib's
 * server.ts), `table` the table config (lib/<plural>-table.ts, or the lib's
 * <plural>-table.ts). A lib also has `types` and the app's `appTable`.
 */
export function dataFiles(names: ResourceNames, target: FrontendTarget | string): { lib: string; table: string; types?: string; appTable?: string } {
  const t = toTarget(target);
  const { p } = names;
  const appLib = `${frontendApp(t.app)}/lib`;
  if (t.kind === 'app') return { lib: `${appLib}/${p.kebab}.ts`, table: `${appLib}/${p.kebab}-table.ts` };
  return {
    lib: `${t.dir}/server.ts`,
    table: `${t.dir}/${p.kebab}-table.ts`,
    types: `${t.dir}/types.ts`,
    appTable: `${appLib}/${p.kebab}-table.ts`,
  };
}

/** Server actions and the delete confirmation. */
export function actionFiles(names: ResourceNames, target: FrontendTarget | string) {
  const t = toTarget(target);
  return {
    actions: `${t.kind === 'app' ? routeDir(names, t) : t.dir}/actions.ts`,
    dialogs: `${componentsDir(names, t)}/${names.s.kebab}-dialogs.tsx`,
  };
}

export function formFiles(names: ResourceNames, target: FrontendTarget | string) {
  const t = toTarget(target);
  return {
    schema: `${t.kind === 'app' ? routeDir(names, t) : t.dir}/schema.ts`,
    form: `${componentsDir(names, t)}/${names.s.kebab}-form.tsx`,
  };
}

export const listFiles = (names: ResourceNames, target: FrontendTarget | string) => ({
  page: `${routeDir(names, target)}/page.tsx`,
  columns: `${componentsDir(names, target)}/${names.p.kebab}-table.tsx`,
});

export const detailFiles = (names: ResourceNames, target: FrontendTarget | string) => ({
  component: `${componentsDir(names, target)}/${names.s.kebab}-detail.tsx`,
  page: `${routeDir(names, target)}/[id]/page.tsx`,
});

/** A lib's catalogs: packages/frontend/<lib>/src[/<plural>]/messages. */
export const libMessagesDir = (target: LibTarget) => `${target.dir}/messages`;

/**
 * How the generated code refers to the resource's modules, as the sync
 * writes it: the enum labels' module seen from the components, the form
 * schema's, the detail links' base (a template-literal part), and the type
 * of the message keys in plain-data modules.
 */
export interface PageRefs {
  /** The layout: app or lib. */
  kind: FrontendTarget['kind'];
  /** The table config module, from the list, detail and form components. */
  table: string;
  /** The form schema module, from the form component. */
  schema: string;
  /** The list's path in a link: "/invoices", or "${path}" (the components' prop). */
  link: string;
  /** The message-key type and its module (from the table and schema modules). */
  messageKey: { name: string; module: string };
}

export function pageRefs(names: ResourceNames, target: FrontendTarget | string = DEFAULT_FRONTEND_APP): PageRefs {
  const t = toTarget(target);
  const { p } = names;
  if (t.kind === 'app')
    return {
      kind: 'app',
      table: `@/lib/${p.kebab}-table`,
      schema: './schema',
      link: `/${p.kebab}`,
      messageKey: { name: 'MessageKey', module: '@dafne/frontend-ui/lib/message-key' },
    };
  return {
    kind: 'lib',
    table: `../${p.kebab}-table.ts`,
    schema: '../schema.ts',
    link: '${path}',
    messageKey: { name: `${p.pascal}MessageKey`, module: './messages/index.ts' },
  };
}

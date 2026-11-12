import { routeDir, type FrontendTarget } from '../core/frontend-target.ts';
import { render } from '../core/templates.ts';
import {
  actionFiles,
  dataFiles,
  detailFiles,
  formFiles,
  listFiles,
  syncDetailPage,
  syncForm,
  syncList,
  warnReports,
} from '../sync/frontend.ts';
import { wireNav, wireResourceLib } from '../wiring/frontend.ts';
import { contractFile } from './backend.ts';
import type { Ctx, Piece } from './pieces.ts';

export interface FrontendOptions {
  /** lucide-react icon for the sidebar and the empty list. */
  icon: string;
  /** Sidebar section. */
  section: string;
  admin: boolean;
}

/**
 * A frontend piece's context: `target` says where the code goes (the app,
 * or a lib with the route pages in the app); `app` is the app either way.
 */
export interface FrontendCtx extends Ctx {
  options: FrontendOptions;
  target: FrontendTarget;
  /**
   * The fields the resource's change log shows (`loggedFields`), when it
   * keeps one and @dafne/frontend-changelog is wired (`wireChangelogFrontend`):
   * its fetcher, server action and history sheet are generated too, the
   * latter in the detail page's menu.
   */
  changelog?: string[];
}

export const DEFAULT_ICON = 'FileIcon';

/** The options with their defaults: section CRM, or Admin when admin-only. */
export const frontendOptions = (options: Partial<FrontendOptions>): FrontendOptions => ({
  icon: options.icon ?? DEFAULT_ICON,
  section: options.section ?? (options.admin ? 'Admin' : 'CRM'),
  admin: options.admin ?? false,
});

/**
 * Renders a template of the target's layout: templates/frontend (the app)
 * or templates/frontend-lib-resource (a lib, `app/…` for its route pages).
 * `changelog` is the logged fields, or null.
 */
const create = (ctx: FrontendCtx, path: string, template: string) => {
  const dir = ctx.target.kind === 'app' ? 'frontend' : 'frontend-lib-resource';
  const pkg = ctx.target.kind === 'lib' ? ctx.target.pkg : undefined;
  const changelog = ctx.changelog ?? null;
  ctx.changes.create(path, render(`${dir}/${template}`, { ...ctx.names, icon: ctx.options.icon, pkg, changelog }));
};

/** In a lib, the template's name for the app layout's one. */
const pick = (ctx: FrontendCtx, app: string, lib: string) => (ctx.target.kind === 'app' ? app : lib);

export const frontendPieces: Record<string, Piece<FrontendCtx>> = {
  data: {
    description: 'API types, fetchers and table config: lib/<plural>.ts and lib/<plural>-table.ts, or a lib\'s types.ts, server.ts and <plural>-table.ts',
    deps: [],
    marker: (n, ctx) => dataFiles(n, ctx.target).lib,
    generate(ctx) {
      const { p } = ctx.names;
      if (!ctx.changes.exists(contractFile(ctx.names))) {
        ctx.changes.warn(
          `The contract ${contractFile(ctx.names)} doesn't exist: the pages won't compile until you run "dafne g backend-resource ${p.kebab}" (or "dafne g contract ${p.kebab}").`,
        );
      }
      const files = dataFiles(ctx.names, ctx.target);
      if (ctx.target.kind === 'app') {
        create(ctx, files.lib, 'lib.ts');
        create(ctx, files.table, 'lib-table.ts');
        return;
      }
      // The lib: its package, exports and texts, wired into the app.
      wireResourceLib(ctx.changes, ctx.names, ctx.target);
      create(ctx, files.types!, 'types.ts');
      create(ctx, files.lib, 'server.ts');
      create(ctx, files.table, 'table.ts');
      create(ctx, files.appTable!, 'app/table.ts');
    },
  },
  actions: {
    description: 'Server actions (save, delete), form schema and the delete confirmation (<singular>-dialogs.tsx)',
    deps: ['data'],
    marker: (n, ctx) => actionFiles(n, ctx.target).actions,
    generate(ctx) {
      const files = actionFiles(ctx.names, ctx.target);
      create(ctx, files.actions, 'actions.ts');
      create(ctx, formFiles(ctx.names, ctx.target).schema, 'schema.ts');
      // Confirmation dialogs, shared by the list's and the detail page's menus.
      create(ctx, files.dialogs, pick(ctx, 'dialogs.tsx', 'components/dialogs.tsx'));
    },
  },
  list: {
    description: 'List page and <plural>-table.tsx (table, columns, row actions)',
    deps: ['data', 'actions'],
    marker: (n, ctx) => listFiles(n, ctx.target).page,
    generate(ctx) {
      const { s } = ctx.names;
      const files = listFiles(ctx.names, ctx.target);
      const components = files.columns.slice(0, files.columns.lastIndexOf('/'));
      create(ctx, files.page, pick(ctx, 'page.tsx', 'app/page.tsx'));
      create(ctx, files.columns, pick(ctx, 'table.tsx', 'components/table.tsx'));
      create(ctx, `${components}/${s.kebab}-table-actions.tsx`, pick(ctx, 'table-actions.tsx', 'components/table-actions.tsx'));
      warnReports(ctx.changes, syncList(ctx.changes, ctx.names, ctx.target));
    },
  },
  detail: {
    description: 'Detail page ([id]), its loader and the <singular>-detail component',
    deps: ['data', 'actions'],
    marker: (n, ctx) => detailFiles(n, ctx.target).page,
    generate(ctx) {
      const { s } = ctx.names;
      const files = detailFiles(ctx.names, ctx.target);
      const components = files.component.slice(0, files.component.lastIndexOf('/'));
      const dir = routeDir(ctx.names, ctx.target);
      create(ctx, files.component, pick(ctx, 'detail.tsx', 'components/detail.tsx'));
      // A logged resource's history, in a sheet opened from the menu.
      if (ctx.changelog) {
        create(ctx, `${components}/${s.kebab}-changelog.tsx`, pick(ctx, 'changelog.tsx', 'components/changelog.tsx'));
        warnMissingChangesAction(ctx);
      }
      create(ctx, `${components}/${s.kebab}-detail-actions.tsx`, pick(ctx, 'detail-actions.tsx', 'components/detail-actions.tsx'));
      create(ctx, files.page, pick(ctx, 'detail-page.tsx', 'app/detail-page.tsx'));
      create(ctx, `${dir}/[id]/load-${s.kebab}.ts`, pick(ctx, 'load.ts', 'app/load.ts'));
      warnReports(ctx.changes, syncDetailPage(ctx.changes, ctx.names, ctx.target));
    },
  },
  form: {
    description: 'Create/edit form with the new and [id]/edit pages',
    deps: ['data', 'actions', 'detail'],
    marker: (n, ctx) => formFiles(n, ctx.target).form,
    generate(ctx) {
      const dir = routeDir(ctx.names, ctx.target);
      create(ctx, formFiles(ctx.names, ctx.target).form, pick(ctx, 'form.tsx', 'components/form.tsx'));
      create(ctx, `${dir}/new/page.tsx`, pick(ctx, 'new-page.tsx', 'app/new-page.tsx'));
      create(ctx, `${dir}/[id]/edit/page.tsx`, pick(ctx, 'edit-page.tsx', 'app/edit-page.tsx'));
      warnReports(ctx.changes, syncForm(ctx.changes, ctx.names, ctx.target));
    },
  },
  nav: {
    description: 'Sidebar link in lib/navigation.ts (always in the app)',
    deps: [],
    marker: () => undefined,
    generate(ctx) {
      const { p } = ctx.names;
      const { icon, section, admin } = ctx.options;
      wireNav(ctx.changes, ctx.app, { title: p.title, href: `/${p.kebab}`, icon, section, adminOnly: admin });
    },
  },
};

/**
 * The history sheet calls `get<S>Changes`, which the actions piece writes
 * for a logged resource: warns when actions.ts predates the change log.
 */
function warnMissingChangesAction(ctx: FrontendCtx) {
  const { s, p } = ctx.names;
  const { actions } = actionFiles(ctx.names, ctx.target);
  const { lib } = dataFiles(ctx.names, ctx.target);
  if (!(ctx.changes.read(actions) ?? '').includes(`get${s.pascal}Changes`)) {
    ctx.changes.warn(
      `${actions} has no get${s.pascal}Changes (nor ${lib} list${s.pascal}Changes, maybe): the history sheet needs them. Copy them from a resource generated with a change log (GET /${p.kebab}/:id/changes).`,
    );
  }
}

/** Every frontend piece of a resource, in generation order. */
export const FRONTEND_RESOURCE = ['data', 'actions', 'list', 'detail', 'form', 'nav'];

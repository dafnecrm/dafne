import { render } from '../core/templates.ts';
import {
  dataFiles,
  detailFiles,
  formFiles,
  listFiles,
  routeDir,
  syncDetailPage,
  syncForm,
  syncList,
  warnReports,
} from '../sync/frontend.ts';
import { wireNav } from '../wiring/frontend.ts';
import { contractFile } from './backend.ts';
import type { Ctx, Piece } from './pieces.ts';

export interface FrontendOptions {
  /** lucide-react icon for the sidebar and the empty list. */
  icon: string;
  /** Sidebar section. */
  section: string;
  admin: boolean;
}

/** A frontend piece's context: `app` is the frontend app (apps/<app>). */
export interface FrontendCtx extends Ctx {
  options: FrontendOptions;
}

export const DEFAULT_ICON = 'FileIcon';

/** The options with their defaults: section CRM, or Admin when admin-only. */
export const frontendOptions = (options: Partial<FrontendOptions>): FrontendOptions => ({
  icon: options.icon ?? DEFAULT_ICON,
  section: options.section ?? (options.admin ? 'Admin' : 'CRM'),
  admin: options.admin ?? false,
});

const create = (ctx: FrontendCtx, path: string, template: string) =>
  ctx.changes.create(path, render(`frontend/${template}`, { ...ctx.names, icon: ctx.options.icon }));

export const frontendPieces: Record<string, Piece<FrontendCtx>> = {
  data: {
    description: 'lib/<plural>.ts (API types and fetchers) and lib/<plural>-table.ts (table config)',
    deps: [],
    marker: (n, app) => dataFiles(n, app).lib,
    generate(ctx) {
      const { p } = ctx.names;
      if (!ctx.changes.exists(contractFile(ctx.names)))
        ctx.changes.warn(
          `The contract ${contractFile(ctx.names)} doesn't exist: the pages won't compile until you run "dafne g backend-resource ${p.kebab}" (or "dafne g contract ${p.kebab}").`,
        );
      const files = dataFiles(ctx.names, ctx.app);
      create(ctx, files.lib, 'lib.ts');
      create(ctx, files.table, 'lib-table.ts');
    },
  },
  actions: {
    description: 'Server actions (save, delete), form schema and the delete confirmation (<singular>-dialogs.tsx)',
    deps: ['data'],
    marker: (n, app) => `${routeDir(n, app)}/actions.ts`,
    generate(ctx) {
      const dir = routeDir(ctx.names, ctx.app);
      create(ctx, `${dir}/actions.ts`, 'actions.ts');
      create(ctx, `${dir}/schema.ts`, 'schema.ts');
      // Confirmation dialogs, shared by the list's and the detail page's menus.
      create(ctx, `${dir}/${ctx.names.s.kebab}-dialogs.tsx`, 'dialogs.tsx');
    },
  },
  list: {
    description: 'List page and <plural>-table.tsx (table, columns, row actions)',
    deps: ['data', 'actions'],
    marker: (n, app) => listFiles(n, app).page,
    generate(ctx) {
      const { s } = ctx.names;
      const dir = routeDir(ctx.names, ctx.app);
      const files = listFiles(ctx.names, ctx.app);
      create(ctx, files.page, 'page.tsx');
      create(ctx, files.columns, 'table.tsx');
      create(ctx, `${dir}/${s.kebab}-table-actions.tsx`, 'table-actions.tsx');
      warnReports(ctx.changes, syncList(ctx.changes, ctx.names, ctx.app));
    },
  },
  detail: {
    description: 'Detail page ([id]), its loader and the <singular>-detail component',
    deps: ['data', 'actions'],
    marker: (n, app) => detailFiles(n, app).page,
    generate(ctx) {
      const { s } = ctx.names;
      const dir = routeDir(ctx.names, ctx.app);
      const files = detailFiles(ctx.names, ctx.app);
      create(ctx, files.component, 'detail.tsx');
      create(ctx, `${dir}/${s.kebab}-detail-actions.tsx`, 'detail-actions.tsx');
      create(ctx, files.page, 'detail-page.tsx');
      create(ctx, `${dir}/[id]/load-${s.kebab}.ts`, 'load.ts');
      warnReports(ctx.changes, syncDetailPage(ctx.changes, ctx.names, ctx.app));
    },
  },
  form: {
    description: 'Create/edit form with the new and [id]/edit pages',
    deps: ['data', 'actions', 'detail'],
    marker: (n, app) => formFiles(n, app).form,
    generate(ctx) {
      const dir = routeDir(ctx.names, ctx.app);
      create(ctx, formFiles(ctx.names, ctx.app).form, 'form.tsx');
      create(ctx, `${dir}/new/page.tsx`, 'new-page.tsx');
      create(ctx, `${dir}/[id]/edit/page.tsx`, 'edit-page.tsx');
      warnReports(ctx.changes, syncForm(ctx.changes, ctx.names, ctx.app));
    },
  },
  nav: {
    description: 'Sidebar link in lib/navigation.ts',
    deps: [],
    marker: () => undefined,
    generate(ctx) {
      const { p } = ctx.names;
      const { icon, section, admin } = ctx.options;
      wireNav(ctx.changes, ctx.app, { title: p.title, href: `/${p.kebab}`, icon, section, adminOnly: admin });
    },
  },
};

/** Every frontend piece of a resource, in generation order. */
export const FRONTEND_RESOURCE = ['data', 'actions', 'list', 'detail', 'form', 'nav'];

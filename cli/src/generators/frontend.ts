import type { Changes } from '../core/changes.js';
import { casings, words, type ResourceNames } from '../core/names.js';
import { render } from '../core/templates.js';
import { FRONTEND, wireNav } from '../wiring/frontend.js';
import { contractFile } from './backend.js';
import type { Ctx, Piece } from './pieces.js';

const routeDir = ({ p }: ResourceNames) => `${FRONTEND}/app/(app)/${p.kebab}`;

const create = (ctx: Ctx, path: string, template: string) =>
  ctx.changes.create(
    path,
    render(`frontend/${template}`, { ...ctx.names, icon: ctx.options.icon }),
  );

export const frontendPieces: Record<string, Piece> = {
  data: {
    description: 'lib/<plural>.ts (API types and fetchers) and lib/<plural>-table.ts',
    deps: [],
    marker: (n) => `${FRONTEND}/lib/${n.p.kebab}.ts`,
    generate(ctx) {
      const { p } = ctx.names;
      if (!ctx.changes.exists(contractFile(ctx.names)))
        ctx.changes.warn(
          `The backend contract ${contractFile(ctx.names)} doesn't exist: the frontend won't compile until you run "dafne g backend contract ${p.kebab}".`,
        );
      create(ctx, `${FRONTEND}/lib/${p.kebab}.ts`, 'lib.ts');
      create(ctx, `${FRONTEND}/lib/${p.kebab}-table.ts`, 'lib-table.ts');
    },
  },
  actions: {
    description: 'Server actions (save, delete), form schema and delete button',
    deps: ['data'],
    marker: (n) => `${routeDir(n)}/actions.ts`,
    generate(ctx) {
      const dir = routeDir(ctx.names);
      create(ctx, `${dir}/actions.ts`, 'actions.ts');
      create(ctx, `${dir}/schema.ts`, 'schema.ts');
      create(ctx, `${dir}/delete-${ctx.names.s.kebab}-button.tsx`, 'delete-button.tsx');
    },
  },
  table: {
    description: 'List page with filters, sorting, paging and row actions',
    deps: ['data', 'actions'],
    marker: (n) => `${routeDir(n)}/page.tsx`,
    generate(ctx) {
      const { s, p } = ctx.names;
      const dir = routeDir(ctx.names);
      create(ctx, `${dir}/page.tsx`, 'page.tsx');
      create(ctx, `${dir}/${p.kebab}-table.tsx`, 'table.tsx');
      create(ctx, `${dir}/columns.tsx`, 'columns.tsx');
      create(ctx, `${dir}/${s.kebab}-actions.tsx`, 'row-actions.tsx');
    },
  },
  detail: {
    description: 'Detail page ([id]), its loader and the <singular>-detail component',
    deps: ['data', 'actions'],
    marker: (n) => `${routeDir(n)}/[id]/page.tsx`,
    generate(ctx) {
      const dir = `${routeDir(ctx.names)}/[id]`;
      create(ctx, `${routeDir(ctx.names)}/${ctx.names.s.kebab}-detail.tsx`, 'detail.tsx');
      create(ctx, `${dir}/page.tsx`, 'detail-page.tsx');
      create(ctx, `${dir}/load-${ctx.names.s.kebab}.ts`, 'load.ts');
    },
  },
  form: {
    description: 'Create/edit form with the new and [id]/edit pages',
    deps: ['data', 'actions', 'detail'],
    marker: (n) => `${routeDir(n)}/${n.s.kebab}-form.tsx`,
    generate(ctx) {
      const dir = routeDir(ctx.names);
      create(ctx, `${dir}/${ctx.names.s.kebab}-form.tsx`, 'form.tsx');
      create(ctx, `${dir}/new/page.tsx`, 'new-page.tsx');
      create(ctx, `${dir}/[id]/edit/page.tsx`, 'edit-page.tsx');
    },
  },
  nav: {
    description: 'Sidebar link in lib/navigation.ts',
    deps: [],
    marker: () => undefined,
    generate(ctx) {
      const { p } = ctx.names;
      const { icon, section, admin } = ctx.options;
      wireNav(ctx.changes, {
        title: p.title,
        href: `/${p.kebab}`,
        icon,
        section,
        adminOnly: admin,
      });
    },
  },
};

/** Every frontend piece of a resource, in generation order. */
export const FRONTEND_RESOURCE = ['data', 'actions', 'table', 'detail', 'form', 'nav'];

/** A blank page at app/(app)/<route>/page.tsx, e.g. "reports/monthly". */
export function generatePage(changes: Changes, route: string) {
  const segments = route
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (!segments.length) throw new Error('Give the page a route, e.g. "reports/monthly".');
  for (const segment of segments)
    if (!/^(\[{1,2}(\.\.\.)?[A-Za-z0-9_-]+\]{1,2}|\([a-z0-9-]+\)|[a-z0-9-]+)$/.test(segment))
      throw new Error(
        `"${segment}" isn't a valid route segment: use kebab-case, [param] or (group).`,
      );
  const last = segments.filter((segment) => /^[a-z0-9-]+$/.test(segment)).pop();
  const name = casings(words(last ?? 'page'));
  const path = `${FRONTEND}/app/(app)/${segments.join('/')}/page.tsx`;
  changes.create(path, render('frontend/blank-page.tsx', { title: name.title, component: name.pascal }));
  return path;
}

/** A component at <dir>/<kebab>.tsx (default components/). */
export function generateComponent(
  changes: Changes,
  input: string,
  { client = false, dir = 'components' }: { client?: boolean; dir?: string },
) {
  const name = casings(words(input));
  if (!/^[a-z]/.test(name.camel)) throw new Error(`"${input}" must start with a letter.`);
  const clean = dir.replace(/^\.?\/+|\/+$/g, '');
  if (clean.split('/').includes('..')) throw new Error('--dir must stay inside frontend/.');
  const path = `${FRONTEND}/${clean}/${name.kebab}.tsx`;
  changes.create(path, render('frontend/component.tsx', { name, client }));
  return path;
}

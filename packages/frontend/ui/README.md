# @dafne/frontend-ui

The frontend's design system: [shadcn/ui](https://ui.shadcn.com) components
(style `base-nova`, on [Base UI](https://base-ui.com)) and the generic
pieces they need.

## Imports

By path, no index:

| Import                                 | What                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@dafne/frontend-ui/components/<name>` | `button`, `dialog`, `sidebar`, `table`, `date-picker`, `text-editor`, `local-date`, `theme-toggle`… |
| `@dafne/frontend-ui/lib/utils`         | `cn`                                                                                                |
| `@dafne/frontend-ui/lib/dates`         | date formats, `formatDate`, `localeFor`                                                             |
| `@dafne/frontend-ui/lib/theme`         | `useTheme`, `setTheme`, `applySavedTheme`, `THEME_SCRIPT`                                                              |
| `@dafne/frontend-ui/lib/message-key`   | `MessageKey`, the type of the app's message keys                                                    |
| `@dafne/frontend-ui/hooks/use-mobile`  | `useIsMobile`                                                                                       |

## Adding components

```sh
pnpm --filter @dafne/frontend-ui shadcn:add <component>
```

`components.json` is here; the components import each other by package
name, as shadcn writes them (`tsconfig.json` maps it to `src/`). The CSS
every app shares (theme, variables, base styles) is
`src/styles/globals.css`; `shadcn:add` writes there.

## Theme

An app's `app/globals.css` imports Tailwind, then the shared CSS, then
overrides the variables of its own look:

```css
@import "tailwindcss";
@import "@dafne/frontend-ui/styles/globals.css";

:root {
  --primary: oklch(0.55 0.2 260);
  --radius: 0.375rem;
}
.dark {
  --primary: oklch(0.7 0.15 260);
}
```

The shared CSS also scans `packages/frontend` for Tailwind classes
(`@source`); the app's own files are found by Tailwind itself.

## Texts

No texts of its own: components translate the app's message keys with
`useTranslations()` (next-intl). They are type-checked when the app
compiles the package.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/frontend-ui
pnpm nx typecheck @dafne/frontend-ui
```

There is no build: `apps/sales-web` compiles the sources (`transpilePackages`
in its `next.config.ts`).

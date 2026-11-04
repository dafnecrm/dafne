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
| `@dafne/frontend-ui/lib/theme`         | `useTheme`, `setTheme`, `THEME_SCRIPT`                                                              |
| `@dafne/frontend-ui/lib/message-key`   | `MessageKey`, the type of the app's message keys                                                    |
| `@dafne/frontend-ui/hooks/use-mobile`  | `useIsMobile`                                                                                       |

## Adding components

```sh
pnpm --filter @dafne/frontend-ui shadcn:add <component>
```

`components.json` is here; the components import each other by package
name, as shadcn writes them (`tsconfig.json` maps it to `src/`). The CSS
(theme, variables) stays in `apps/frontend/app/globals.css`, which scans
this package for Tailwind classes (`@source`).

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

There is no build: `apps/frontend` compiles the sources (`transpilePackages`
in its `next.config.ts`).

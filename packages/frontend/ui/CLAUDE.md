# @dafne/frontend-ui

The frontend's design system: shadcn components (style `base-nova`, Base
UI) and the small generic pieces they need. TypeScript sources compiled by
Next (`transpilePackages`).

- Imports by path, no index: `@dafne/frontend-ui/components/<name>`
  (`src/components/<name>.tsx`), `@dafne/frontend-ui/lib/<name>`
  (`src/lib/<name>.ts`: utils, dates, theme, message-key, currencies,
  country-name), `@dafne/frontend-ui/hooks/<name>` (`src/hooks/<name>.ts`:
  use-mobile, use-option-labels). The folder decides the path: a `.ts` file
  under `lib/` isn't found as `components/<name>`. The components import
  each other the same way (tsconfig `paths` points the package name at
  `src/`).
- After adding or moving a file here, if the app doesn't see it, rebuild
  the declarations: `pnpm exec tsc --build --emitDeclarationOnly --force`
  from this folder (see `docs/nx.md`, "Packages that ship sources").
- New shadcn components: `pnpm --filter @dafne/frontend-ui shadcn:add
  <name>` (`components.json` here). It writes the CSS variables into
  `src/styles/globals.css`.
- `src/styles/globals.css` is the CSS every app shares
  (`@dafne/frontend-ui/styles/globals.css`): the default theme (`:root`,
  `.dark`), Tailwind's colors bound to it (`@theme inline`), base styles,
  the text editor's content, and `@source` of `packages/frontend`. An
  app's `app/globals.css` imports it after `tailwindcss` and overrides
  only the variables of its own look.
- Texts are the app's messages (`useTranslations()`); `MessageKey` is
  typed from them when the app compiles this package. Alone, keys are
  plain strings: `Extract<keyof …, string>` where a key type is needed.

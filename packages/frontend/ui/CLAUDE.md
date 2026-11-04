# @dafne/frontend-ui

The frontend's design system: shadcn components (style `base-nova`, Base
UI) and the small generic pieces they need. TypeScript sources compiled by
Next (`transpilePackages`).

- Imports by path, no index: `@dafne/frontend-ui/components/<name>`,
  `@dafne/frontend-ui/lib/<utils|dates|theme|message-key>`,
  `@dafne/frontend-ui/hooks/use-mobile`. The components import each other
  the same way (tsconfig `paths` points the package name at `src/`).
- New shadcn components: `pnpm --filter @dafne/frontend-ui shadcn:add
  <name>` (`components.json` here; the CSS stays in
  `apps/frontend/app/globals.css`, which `@source`s this package).
- Texts are the app's messages (`useTranslations()`); `MessageKey` is
  typed from them when the app compiles this package. Alone, keys are
  plain strings: `Extract<keyof …, string>` where a key type is needed.

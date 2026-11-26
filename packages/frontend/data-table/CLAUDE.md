# @dafne/frontend-data-table

Server-side data tables. TypeScript sources compiled by Next. Relative
imports end in `.ts`.

- `.`: config and URL state (`defineDataTable`, `getTableParams`,
  `TableParams`…), plain data used by server pages and client tables.
- `./table`: the `DataTable` component, `DataTableFilters`,
  `createDataTableColumnHelper`.
- A filter needing a richer picker (e.g. `CustomerSelect`) gets it from
  the client table, `<DataTable filterControls={{ field: Control }}>`,
  never from the config: the config is plain data the server page passes
  to the client, and components can't cross that boundary.
- Each resource's config (`apps/sales-web/lib/<resource>-table.ts`) and
  columns stay in the app. Labels are the app's message keys.
- Below a 42rem container (`@container` / `@2xl:`), rows are cards: each
  column's `meta.mobile` (`title | subtitle | aside | field | hidden`,
  default `field`) places it. Both layouts render and CSS picks one, so
  don't switch them with `useIsMobile` (the server can't know the width).

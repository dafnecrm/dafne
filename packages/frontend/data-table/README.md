# @dafne/frontend-data-table

Server-side data tables: paging, sort and filters in the URL, data from
the backend. On [TanStack Table](https://tanstack.com/table).

## Entry points

| Import                             | What                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@dafne/frontend-data-table`       | `defineDataTable`, `getTableParams`, `TableParams`, `TableSort`, `TableFilters`… Plain data, for server pages and client tables. |
| `@dafne/frontend-data-table/table` | `DataTable`, `DataTableFilters`, `DataTableEmpty`, `createDataTableColumnHelper`                                                 |

## Usage

Each resource defines its config (`apps/sales-web/lib/<resource>-table.ts`):

```ts
export const customersTable = defineDataTable({
  path: "/customers",
  sortable: ["name", "createdAt"] satisfies CustomerSortField[],
  defaultSort: { id: "createdAt", desc: true },
  filters: [{ field: "name", label: "customers.fields.name" }],
});
```

The server page reads the URL with it (`getTableParams`), asks the backend
for the page, and passes rows and params to `DataTable`. The URL
(`?page=`, `?limit=`, `?sort=`, `?dir=`, one param per filter) is the
source of truth, so any view can be shared or reloaded.

Labels are the app's message keys, translated by the component.

A filter is a text box, or a combobox when it has `options`. For a richer
picker, the client table passes `filterControls` to `DataTable`, keyed by
filter field (e.g. `{ customerId: CustomerFilter }`): components can't go
in the config, which the server page passes to the client as plain data.

### Mobile

In a container narrower than 42rem (a phone, or a sheet on desktop), each
row is a card, sorting is a select and the filters open in a drawer. Each
column's `meta.mobile` says where it goes in the card:

| `mobile`   | In the card                                 |
| ---------- | ------------------------------------------- |
| `title`    | The heading, without a label (none if unset) |
| `subtitle` | Small, muted, under the title               |
| `field`    | A label and its value (the default)         |
| `aside`    | Bottom right: dates, amounts                |
| `hidden`   | Not shown                                   |

```ts
col.accessor("name", { header: t("name"), meta: { mobile: "title" } }),
col.accessor("createdAt", { header: t("createdAt"), meta: { className: "text-right", mobile: "aside" } }),
```

Row actions go in the card's top right corner.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/frontend-data-table
pnpm nx typecheck @dafne/frontend-data-table
```

There is no build: `apps/sales-web` compiles the sources (`transpilePackages`
in its `next.config.ts`).

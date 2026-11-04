# @dafne/frontend-data-table

Server-side data tables: paging, sort and filters in the URL, data from
the backend. On [TanStack Table](https://tanstack.com/table).

## Entry points

| Import                             | What                                                                                                                             |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@dafne/frontend-data-table`       | `defineDataTable`, `getTableParams`, `TableParams`, `TableSort`, `TableFilters`… Plain data, for server pages and client tables. |
| `@dafne/frontend-data-table/table` | `DataTable`, `DataTableFilters`, `DataTableEmpty`, `createDataTableColumnHelper`                                                 |

## Usage

Each resource defines its config (`apps/frontend/lib/<resource>-table.ts`):

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

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/frontend-data-table
pnpm nx typecheck @dafne/frontend-data-table
```

There is no build: `apps/frontend` compiles the sources (`transpilePackages`
in its `next.config.ts`).

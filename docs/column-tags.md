# Column tags (`@api`, `@form`)

A resource's table (`packages/backend/database/src/tables/<plural>.ts`) is
where its API begins. Each column decides where it goes:
- in the **contract** (`packages/contracts/src/<plural>.ts`): the body
  schema, the list and detail responses, the filter and sort fields;
- in the **service**: the list's `select`, the detail's `findFirst`
  columns, the insert's `values`, the update's `set`, `EXACT_FILTERS`;
- in the **pages**: the form's inputs, the list's columns, the detail's
  rows.

The CLI reads it when it generates (`dafne g backend-resource`) and when it
syncs (`dafne sync contract`, `dafne sync frontend-resource`). Most columns
need nothing: the defaults below follow the column's type. A tag in the
column's comment changes them:

```ts
export const salesOrder = salesSchema.table('sales_order', {
  /** @api detail */
  notes: text('notes'),
  /**
   * The quotation it was made from, when accepted. @api readonly detail
   */
  quotationId: integer('quotation_id').references(() => quotation.id),
  // @api writeonly
  pin: varchar('pin', { length: 6 }),
});
```

- **Where:** in a comment just above the column, JSDoc (`/** … */`) or
  line (`// …`). The tag can sit anywhere in the comment's text.
- **Several tags:** one `@api` takes several, separated by spaces or
  commas (`@api readonly, detail`). Several `@api` add up, and `@api` and
  `@form` can share a line (`@api detail @form editor`).
- **Unknown words:** a word after `@api` that isn't a tag is ignored, and
  the sync warns about it (`unknown tag "@api output"`). Read the
  warnings: an ignored tag means the defaults apply.
- **From the generator:** `--field notes:text:api=detail` writes the
  comment (`api=readonly|detail` for several tags), and
  `--field notes:text:editor` writes `@form editor`.

## The defaults

What a column gets with no tag:

| Column                                                        | Body | List | Detail | Filter | Sort |
| ------------------------------------------------------------- | :--: | :--: | :----: | :----: | :--: |
| the `id` (primary key)                                        | only if the database doesn't fill it (a `varchar` id) | ✓ | ✓ | exact | ✓ |
| a key to another record (`customerId`, `.references(…)`)      | ✓ | ✓ | ✓ | exact | — |
| text, enum, boolean (`varchar`, `text`, `text({ enum })`, `boolean`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| numbers and dates (`integer`, `numeric`, `real`, `date`, `timestamp`) | ✓ | ✓ | ✓ | — | ✓ |
| `json` / `jsonb`                                              | ✓ | ✓ | ✓ | — | — |
| filled by the database or Drizzle: `serial`, `defaultNow()`, `$onUpdate`, `$defaultFn`, `defaultRandom()`… (`createdAt`, `updatedAt`) | — | ✓ | ✓ | — | where sortable |
| `deletedAt`                                                   | — | — | ✓ | — | — |
| `createdById`, `updatedById` (the service fills them; responses show `createdBy` / `updatedBy`) | — | — | — | — | — |
| a name that looks secret (`password`, `secret`, `token`, `hash`, `salt`) | — | — | — | — | — |
| a type the CLI doesn't map (e.g. `bytea`), or an enum without literal values | — | — | — | — | — |

- **List** means `Listed<S>`, and so the detail too; **Detail** means
  `<S>Detail` only.
- **Filter** is a query param of its own (`GET /<plural>?name=acme`).
  - Text filters match what the field contains (`ilike`).
  - **Exact** ones match the whole value (`eq`): the id and the keys to
    other records, listed in `EXACT_FILTERS` in the service.
  - Boolean filters take `true` / `false`.
- **The body's rules follow the column:**
  - a `NOT NULL` column without a default is required (`requiredText`,
    `requiredId`…);
  - a `NOT NULL` one with a default is optional (`.optional()`, the
    database fills it);
  - a nullable one takes blank, `null` or nothing, all saved as `null`
    (`optionalText`, `optionalDate`…).
- **Responses** type a nullable column `T | null`.
- **Child tables**, declared in the same file and reached through a
  relation (customer addresses, order items): same defaults, but never
  filtered or sorted, and the key to the parent and `position` stay out
  (see [`input`](#input)).

## `@api` tags

### `internal`

**Never in the API**: not in the body, not in the responses, not a filter
or sort field. The detail's `findFirst` leaves it out (`key: false`), so it
doesn't leave the database by mistake.

Use it for data only the backend reads: an external system's id, a hash,
a counter the service keeps. The template file's `content` (a `bytea`) needs
no tag: the CLI doesn't map that type and leaves it out anyway.

```ts
/** @api internal */
externalRef: varchar('external_ref', { length: 64 }),
```

### `readonly`

**In the responses, not in the body**: the client sees it but can't send
it. The service's insert and update don't write it from the body (the
service, a hook or the database fills it). It stays a filter and a sort
field, by the defaults of its type.

Use it for values computed on save: a total, a price fixed when an item
is added, a link set by another process.

```ts
/** The quantity in the product's base unit, computed on save. @api readonly */
baseQuantity: numeric('base_quantity', { precision: 18, scale: 6, mode: 'number' }).notNull(),
```

### `writeonly`

**In the body only**: the client sends it, but responses never return it,
and it is never a filter or sort field. It's the only way to put a column
with a secret-looking name (`password`, `token`…) in the body: without the
tag those are left out of the API.

```ts
/** @api writeonly */
pin: varchar('pin', { length: 6 }),
```

### `detail`

**In the detail, not in the list**: in `<S>Detail` but not in `Listed<S>`,
so the list's `select` doesn't read it. It's no longer a filter or sort
field (the list is what filters and sorts). It stays in the body unless
another tag says otherwise.

Use it for long or heavy values a list doesn't show: notes, descriptions,
JSON settings.

```ts
/** @api detail */
notes: text('notes'),
```

### `filter` / `nofilter`

Turn the column's filter on or off, whatever the defaults say.
- **`filter`** makes a text, enum or boolean column a filter even when its
  other roles wouldn't (e.g. `detail`, or a value the database fills). The
  id and the keys stay exact filters. Other types (numbers, dates) can't
  be filters: the tag does nothing on them.
- **`nofilter`** removes the filter, the id's and the keys' included: the
  query param, the filter field of the list's table config, and its
  `EXACT_FILTERS` entry.

```ts
/** @api nofilter */
customerId: integer('customer_id').references(() => customer.id),
```

### `sort` / `nosort`

Turn the column's sort on or off.
- **`sort`** makes a sortable type (text, enum, boolean, numbers, dates) a
  sort field even when `detail` or `writeonly` would remove it.
- **`nosort`** removes it, the id's included. Check the list's default
  sort (`defaultSort` in its table config) if it was on that field.

```ts
/** @api nosort */
code: varchar('code', { length: 20 }),
```

### `input`

**For child tables:** puts the key to the parent or `position` in the item's
body.
- By default the service sets both: the key from the parent it saves, the
  position from the list's order. They stay out of the item's body.
- With the tag, the client sends the column: e.g. a position the user
  picks, which doesn't have to follow the list's order (the items of an
  order are keyed by it).

On those two columns any `@api` tag lifts the default; `input` is the one
that says why. On other columns it does nothing.

```ts
/** Chosen by the user, not the list's order. @api input */
position: integer('position').notNull(),
```

### `optional`

**A `NOT NULL` column the body may leave out or blank**: the service fills
it.
- The body treats it as nullable (`optionalText`, `optionalId`…, blank or
  missing comes as `null`), and it's not reported as required.
- The response keeps it not null: once saved, it always has a value.
- The sync no longer turns the body member back into a required one. If
  the tag goes, the next sync makes it required again and says so
  (`now required`).

Use it when the service has a fallback the database can't express as a
default: the product's base unit when no unit is given, the current
user's team, a number from a sequence.

```ts
/**
 * The product's base unit, or one that converts to it: the base unit
 * when the body leaves it out. @api optional
 */
uomId: varchar('uom_id', { length: 10 }).notNull().references(() => uom.id),
```

The service must fill it (`uomId: item.uomId ?? product.uomId`), or the
insert fails on the `NOT NULL`.

### `nosave`

**In the body, but the insert and update don't write it**: the service
saves it its own way.
- The contract is unchanged (in the body, in the responses).
- The service's `values({...})` and `set({...})` don't get `key: body.key`;
  if they have it, the sync takes it out.
- The service reads the value from the body and acts on it.

Use it for a value that goes through a process instead of a plain write:
the status of a resource with a state machine (the form sends it, the
service calls `stateMachine.transition(...)`, and the transition checks
and saves it), or a field saved in another table.

```ts
/**
 * Sent by the form, but moved by the state machine, never written
 * by the insert or update. @api nosave
 */
status: text('status', { enum: ['draft', 'sent', 'accepted'] }).notNull().default('draft'),
```

Compared with `readonly`: `readonly` keeps the column out of the body;
`nosave` keeps it in and only stops the plain write.

## `@form` tags

Only for `text` columns (a warning says the tag is ignored on other types).
They choose the form's input; the contract and the service don't change.

### `plain`

A **textarea** (`field.TextareaField`), across the form's whole row; the
detail page shows the text. This is the default: a `text` column without
`@form` gets it.

### `editor`

A **rich text editor** (`field.TextEditorField`) that saves HTML, and on the
detail page the sanitized HTML (`TextEditorContent`), on a row of its own.

The value is HTML, and anything else that reads the column receives HTML
too: a Word template's `{notes}` prints the tags (see
[Documents](documents.md)), and so would an export. Keep it plain unless
the formatting matters more than those uses.

```ts
/** @api detail @form editor */
description: text('description'),
```

## What the sync leaves alone

The tags decide what the CLI manages; code it doesn't recognize as its own
stays as it is:
- **Contract:** hand-written validation in a body member (e.g. a
  `.refine`), and members that aren't columns (relations such as
  `customer`, `items`): kept, and listed by the sync.
- **Service:**
  - Only `key: body.key` (and `key: item.key` in a child's insert) belongs
    to the sync; a key set to anything else (`price: computed`) is left
    alone.
  - An object that spreads the body or the item (`...body`,
    `.values(rows.map((row) => ({ ...row, orderId })))`) saves every field
    already: the sync adds nothing to it.
  - In `EXACT_FILTERS`, only `Number` and `String` entries are the sync's;
    a function (`(value) => value === 'true'`) is kept.
- **Pages:** fields already on a page don't change (the sync only adds
  missing ones, and removes those the contract dropped), and
  `{/* dafne-ignore: <field> */}` keeps a field off a page.

After changing a tag, run `pnpm dafne sync contract <resource> --dry-run`
to see what moves, then without `--dry-run`, then `pnpm dafne sync
frontend-resource <resource>`.

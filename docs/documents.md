# Documents (PDFs from Word templates)

`@dafne/backend-documents` turns a record (a quotation, later a sales order
or an invoice) into a PDF:

1. **The template is a Word file an admin uploads.** It is stored in
   `sales.document_template` (`content bytea`). Templates are never part of
   the repo or of the deploy.
2. [docxtemplater](https://docxtemplater.com) fills the template with the
   record's data, using the angular-expressions parser: a template can only
   read its data, never run code.
3. [Gotenberg](https://gotenberg.dev) converts the filled `.docx` to PDF.
   It is LibreOffice behind HTTP, at `GOTENBERG_URL`; in development it is
   the `gotenberg` service of `compose.yaml`.

## Writing a template (in Word)

| Tag                              | What it does                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------- |
| `{customer.name}`                | Puts a value (a dotted path into the data). A missing value is left empty.       |
| `{#items}…{/items}`              | Repeats its body for each element. Put it in a table row to repeat the row.      |
| `{#notes}…{/notes}`              | Shows its body only when `notes` is set; `{^notes}…{/notes}` shows it when it isn't. |
| `{total \| currency}`            | Formats a value in the template's language. Filters: `currency` (or `currency:"USD"`), `number:2`, `date`, `datetime`, `upper`, `lower`. |

The template's page in the app lists the tags each resource offers. They
come from `GET /document-templates/resources`, built from the source's
sample data. Each upload is filled with that sample data first: a template
with errors is refused (422), with the tags at fault listed.

## Languages

Each template has a `language` (`LANGUAGES` of `@dafne/contracts`: `it`,
`en`), the language of its text, which also formats its numbers, dates
and currencies. A resource has at most one default template **per
language**: "Quotation IT" and "Quotation EN" can both be defaults.

A record's PDF uses the default in the record's language: the `language`
its source's `load` returns (a quotation's and a sales order's is their
customer's `language`), else the user's (`Accept-Language`). When there is
no default in that language it falls back to the default in `it`
(`DEFAULT_LOCALE`), then to any default. A template asked for with
`?template=` is used whatever its language, and is filled in its own.
Uploads are checked, and previews filled, with the sample data in the
template's language.

## The API

| Route                                          | Who                         | What                                                         |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `GET /documents/:resource/:id/pdf?template=`   | signed-in users             | The record's PDF, from the template asked for or the resource's default in the record's language (see Languages). 404 `documents.noTemplate` while none has a file. |
| `GET /document-templates[/:id]`, `/resources`  | signed-in users             | The templates (without their file); the resources and their tags. |
| `POST`, `PUT`, `DELETE /document-templates…`   | `DocumentTemplate.*`        | The CRUD.                                                    |
| `PUT /document-templates/:id/file`             | `DocumentTemplate.update`   | Upload the `.docx` (multipart `file`, up to 5 MB).           |
| `GET /document-templates/:id/file`, `/preview` | signed-in users             | The `.docx`; the PDF filled with sample data.                |

The `DocumentTemplate.*` permissions aren't seeded into the all-users
group (`NOT_SEEDED` in `packages/backend/database/src/permission-seed.spec.ts`):
only admins, or a group given them on purpose, manage templates. Each
resource has at most one default template per language: marking one as
default clears the others of its language.

The frontend side is `@dafne/frontend-documents` (`packages/frontend/documents`):
the templates' pages (components, actions, `defineDocumentTemplatesTable({ path })`),
the PDF button and their texts (`documentTemplates`, `documents`). An app
keeps only its pages, which pass its list path.

The browser never calls the API directly. The app relays the files
through route handlers that re-export the lib's (`@dafne/frontend-documents/routes`)
at `app/[locale]/api/documents/[resource]/[id]/pdf` and
`api/document-templates/[id]/file|preview`, the paths its links use. The
upload also goes through a route handler, because server actions take
bodies of at most 1 MB.

## Giving a resource documents

In the resource's lib, add a provider that implements `DocumentSource` and
mark it with `@DocumentSourceFor('<resource>')`. Then add the provider to
the resource's module, and add `DocumentsModule` to the module's imports
(see `packages/backend/sales-orders/src/quotations/quotation.document.ts`):

- `load(id, { actor, locale })` gives the record's data, the PDF's file
  name and, when the record has one, its `language` (e.g. its customer's),
  which picks the template. It reuses the resource's own `get`, so a
  missing record gets its 404.
- `sample(language)` gives made-up data with every field `load` fills, and at
  least one element in each list.

In the frontend, add the resource's name under
`documentTemplates.resources` in the messages of `@dafne/frontend-documents`
(`src/messages/en.ts`, `it.ts`), and put
`<DocumentPdfButton resource="<resource>" id={…} />`
(`@dafne/frontend-documents/components/document-pdf-button`) on its page. The
button shows only once a template with a file exists.

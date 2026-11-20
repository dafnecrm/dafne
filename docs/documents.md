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
| `{total \| currency}`            | Formats a value in the user's language. Filters: `currency` (or `currency:"USD"`), `number:2`, `date`, `datetime`, `upper`, `lower`. |

The template's page in the app lists the tags each resource offers. They
come from `GET /document-templates/resources`, built from the source's
sample data. Each upload is filled with that sample data first: a template
with errors is refused (422), with the tags at fault listed.

## The API

| Route                                          | Who                         | What                                                         |
| ---------------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| `GET /documents/:resource/:id/pdf?template=`   | signed-in users             | The record's PDF, from the template asked for or the resource's default. 404 `documents.noTemplate` while none has a file. |
| `GET /document-templates[/:id]`, `/resources`  | signed-in users             | The templates (without their file); the resources and their tags. |
| `POST`, `PUT`, `DELETE /document-templates…`   | `DocumentTemplate.*`        | The CRUD.                                                    |
| `PUT /document-templates/:id/file`             | `DocumentTemplate.update`   | Upload the `.docx` (multipart `file`, up to 5 MB).           |
| `GET /document-templates/:id/file`, `/preview` | signed-in users             | The `.docx`; the PDF filled with sample data.                |

The `DocumentTemplate.*` permissions aren't seeded into the all-users
group (`NOT_SEEDED` in `packages/backend/database/src/permission-seed.spec.ts`):
only admins, or a group given them on purpose, manage templates. Each
resource has at most one default template: marking one as default clears
the others.

The browser never calls the API directly. sales-web relays the files
through route handlers (`app/[locale]/api/documents/…` and
`api/document-templates/[id]/file|preview`, `lib/files.ts`). The upload
also goes through a route handler, because server actions take bodies of
at most 1 MB.

## Giving a resource documents

In the resource's lib, add a provider that implements `DocumentSource` and
mark it with `@DocumentSourceFor('<resource>')`. Then add the provider to
the resource's module, and add `DocumentsModule` to the module's imports
(see `packages/backend/sales-orders/src/quotations/quotation.document.ts`):

- `load(id, { actor, locale })` gives the record's data and the PDF's file
  name. It reuses the resource's own `get`, so a missing record gets its
  404.
- `sample(locale)` gives made-up data with every field `load` fills, and at
  least one element in each list.

In the frontend, add the resource's name under
`documentTemplates.resources` in the messages, and put
`<DocumentPdfButton resource="<resource>" id={…} />` on its page. The
button shows only once a template with a file exists.

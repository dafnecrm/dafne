import { schema, type Database } from '@dafne/backend-database';
import { InjectDrizzle } from '@nestjs/drizzle';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  and,
  asc,
  desc,
  eq,
  isNull,
  isNotNull,
  ilike,
  ne,
  sql,
  type Column,
  type SQL,
} from 'drizzle-orm';
import {
  DOCUMENT_TEMPLATE_FILTER_FIELDS,
  type DocumentTemplateFilterField,
  type DocumentTemplateBody,
  type DocumentTemplateDetail,
  type DocumentTemplatesList,
  type ListDocumentTemplatesQuery,
  DOCUMENT_TEMPLATE_MAX_BYTES,
  msg,
  type Language,
} from '@dafne/contracts';
import { DEFAULT_LOCALE } from '@dafne/backend-common';
import {
  CrudHooksRegistry,
  type Actor,
  type CrudHooks,
  type CrudService,
  type Executor,
  type Transaction,
} from '@dafne/backend-crud';
import { DocumentSources } from '../document-sources.js';
import { fillDocx } from '../docx-renderer.js';

export const DOCUMENT_TEMPLATES_DEFAULT_PAGE_SIZE = 20;

const { documentTemplate } = schema;

/** Escapes LIKE wildcards so the value is matched literally. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

/**
 * Filters matched exactly (the id and the keys to other records), with how
 * their query param becomes the column's value; the others contain the text.
 */
const EXACT_FILTERS: Partial<
  Record<
    DocumentTemplateFilterField,
    (value: string) => boolean | number | string
  >
> = {
  id: Number,
  // A registered resource name: matched whole, not as a substring. A
  // function, not String: the CLI's sync keeps only keys and ids as String.
  resource: (value) => value,
  // A language code: matched whole.
  language: (value) => value,
  // "true" | "false" (the contract checks it): ILIKE doesn't work on a boolean.
  isDefault: (value) => value === 'true',
};

/** Document templates that haven't been deleted. */
const notDeleted = isNull(documentTemplate.deletedAt);

/** Only the user's ID and name, for "created by" / "updated by". */
const userSummary = { columns: { id: true, name: true } } as const;

/** An uploaded file, as FileInterceptor (multer, in memory) gives it. */
export interface UploadedTemplate {
  originalname: string;
  buffer: Buffer;
  size: number;
}

/** A template's .docx, for downloading or filling it. */
export interface TemplateFile {
  id: number;
  resource: string;
  /** The language to fill it in: its text's, and its numbers' and dates'. */
  language: Language;
  fileName: string;
  content: Buffer;
}

@Injectable()
export class DocumentTemplatesService implements CrudService<
  number,
  ListDocumentTemplatesQuery,
  DocumentTemplatesList,
  DocumentTemplateBody,
  DocumentTemplateDetail
> {
  /** Runs the writes with the hooks registered on `document-templates`. */
  private readonly hooks: CrudHooks<
    number,
    DocumentTemplateBody,
    DocumentTemplateDetail
  >;

  constructor(
    @InjectDrizzle() private readonly db: Database,
    registry: CrudHooksRegistry,
    private readonly sources: DocumentSources,
  ) {
    this.hooks = registry.for('document-templates', {
      db,
      load: (id, tx) => this.get(id, tx),
    });
  }

  /**
   * Lists document templates that aren't deleted, paged and sorted, filtered by
   * every field given (AND, each matching text the field contains).
   */
  async list(
    query: ListDocumentTemplatesQuery = {},
  ): Promise<DocumentTemplatesList> {
    const {
      limit = DOCUMENT_TEMPLATES_DEFAULT_PAGE_SIZE,
      offset = 0,
      sortBy = 'id',
      sortDirection = 'desc',
    } = query;
    const { db } = this;
    const filters = DOCUMENT_TEMPLATE_FILTER_FIELDS.flatMap((field) => {
      const value = query[field]?.trim();
      if (!value) {
        return [];
      }
      const exact = EXACT_FILTERS[field];
      // As a plain Column: eq can't type a union of columns against number | string.
      return [
        exact
          ? eq(documentTemplate[field] as Column, exact(value))
          : ilike(documentTemplate[field], `%${escapeLike(value)}%`),
      ];
    });
    const where = and(notDeleted, ...filters) as SQL;
    const direction = sortDirection === 'asc' ? asc : desc;

    const [documentTemplates, total] = await Promise.all([
      db
        .select({
          id: documentTemplate.id,
          name: documentTemplate.name,
          resource: documentTemplate.resource,
          language: documentTemplate.language,
          isDefault: documentTemplate.isDefault,
          fileName: documentTemplate.fileName,
          size: documentTemplate.size,
          createdAt: documentTemplate.createdAt,
          updatedAt: documentTemplate.updatedAt,
        })
        .from(documentTemplate)
        .where(where)
        .orderBy(direction(documentTemplate[sortBy]), asc(documentTemplate.id))
        .limit(limit)
        .offset(offset),
      db.$count(documentTemplate, where),
    ]);

    return { items: documentTemplates, total, limit, offset };
  }

  /**
   * One document template that isn't deleted, with who created and last
   * updated it. Throws 404 otherwise.
   */
  async get(
    id: number,
    db: Executor = this.db,
  ): Promise<DocumentTemplateDetail> {
    const found = await db.query.documentTemplate.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { content: false, createdById: false, updatedById: false },
      with: { createdBy: userSummary, updatedBy: userSummary },
    });
    if (!found) {
      throw new NotFoundException(msg('documentTemplates.notFound'));
    }
    return found;
  }

  /**
   * Creates a document template; `actor` is the creator. Runs the hooks registered on
   * `document-templates` (CrudHooksModule.forFeature), in one transaction.
   */
  async create(
    body: DocumentTemplateBody,
    actor: Actor,
  ): Promise<DocumentTemplateDetail> {
    this.checkResource(body.resource);
    // One instant for both: createdAt and updatedAt start equal.
    const now = new Date();
    return this.hooks.create({ body, actor }, async ({ tx, body }) => {
      if (body.isDefault) {
        await this.clearDefault(tx, body.resource, body.language);
      }
      // The id is serial: the database picks it.
      const [{ id }] = await tx
        .insert(documentTemplate)
        .values({
          name: body.name,
          resource: body.resource,
          language: body.language,
          isDefault: body.isDefault,
          createdAt: now,
          updatedAt: now,
          createdById: actor.id,
          updatedById: actor.id,
        })
        .returning({ id: documentTemplate.id });
      return id;
    });
  }

  /**
   * Replaces a document template's fields; `actor` is the editor. Throws 404
   * if the document template doesn't exist or is deleted.
   */
  async update(
    id: number,
    body: DocumentTemplateBody,
    actor: Actor,
  ): Promise<DocumentTemplateDetail> {
    this.checkResource(body.resource);
    return this.hooks.update({ id, body, actor }, async ({ tx, body }) => {
      if (body.isDefault) {
        await this.clearDefault(tx, body.resource, body.language, id);
      }
      const result = await tx
        .update(documentTemplate)
        .set({
          name: body.name,
          resource: body.resource,
          language: body.language,
          isDefault: body.isDefault,
          updatedById: actor.id,
          // The time of this change.
          updatedAt: new Date(),
        })
        .where(and(eq(documentTemplate.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('documentTemplates.notFound'));
      }
    });
  }

  /**
   * Deletes a document template logically: sets deletedAt, so it disappears
   * from the API but stays in the database. Throws 404 if already deleted.
   */
  async delete(id: number, actor: Actor): Promise<void> {
    await this.hooks.delete({ id, actor }, async ({ tx }) => {
      const now = new Date();
      const result = await tx
        .update(documentTemplate)
        .set({ deletedAt: now, updatedAt: now, updatedById: actor.id })
        .where(and(eq(documentTemplate.id, id), notDeleted));
      if (result.rowCount === 0) {
        throw new NotFoundException(msg('documentTemplates.notFound'));
      }
    });
  }

  /**
   * Stores the .docx of a template, replacing the one it had: only Word
   * files up to DOCUMENT_TEMPLATE_MAX_BYTES, which fill without errors
   * with the sample data of the template's resource, in its language (422
   * with the errors otherwise). Not a CRUD write: the body's hooks don't run.
   */
  async setFile(
    id: number,
    file: UploadedTemplate | undefined,
    actor: Actor,
  ): Promise<DocumentTemplateDetail> {
    if (!file) {
      throw new BadRequestException(msg('documentTemplates.file.missing'));
    }
    if (!/\.docx$/i.test(file.originalname)) {
      throw new UnprocessableEntityException(
        msg('documentTemplates.file.notDocx'),
      );
    }
    if (file.size > DOCUMENT_TEMPLATE_MAX_BYTES) {
      throw new UnprocessableEntityException(
        msg('documentTemplates.file.tooLarge'),
      );
    }
    const { resource, language } = await this.get(id);
    // Throws 422 with the tags at fault.
    fillDocx(file.buffer, this.sources.get(resource).sample(language), language);

    const result = await this.db
      .update(documentTemplate)
      .set({
        content: file.buffer,
        fileName: file.originalname.slice(-255),
        size: file.size,
        updatedById: actor.id,
        updatedAt: new Date(),
      })
      .where(and(eq(documentTemplate.id, id), notDeleted));
    if (result.rowCount === 0) {
      throw new NotFoundException(msg('documentTemplates.notFound'));
    }
    return this.get(id);
  }

  /** The .docx of a template; 404 when it's deleted or has no file yet. */
  async file(id: number): Promise<TemplateFile> {
    const [found] = await this.db
      .select({
        id: documentTemplate.id,
        resource: documentTemplate.resource,
        language: documentTemplate.language,
        fileName: documentTemplate.fileName,
        content: documentTemplate.content,
      })
      .from(documentTemplate)
      .where(and(eq(documentTemplate.id, id), notDeleted));
    if (!found) {
      throw new NotFoundException(msg('documentTemplates.notFound'));
    }
    if (!found.content || !found.fileName) {
      throw new NotFoundException(msg('documentTemplates.file.none'));
    }
    return { ...found, fileName: found.fileName, content: found.content };
  }

  /**
   * The .docx to fill for `resource`: the template `id` (it must be of that
   * resource, any language), else the resource's default in `language`,
   * else its default in DEFAULT_LOCALE, else any of its defaults. Null when
   * there is none with a file.
   */
  async fileFor(
    resource: string,
    language: string,
    id?: number,
  ): Promise<TemplateFile | null> {
    const [found] = await this.db
      .select({
        id: documentTemplate.id,
        resource: documentTemplate.resource,
        language: documentTemplate.language,
        fileName: documentTemplate.fileName,
        content: documentTemplate.content,
      })
      .from(documentTemplate)
      .where(
        and(
          eq(documentTemplate.resource, resource),
          id === undefined
            ? eq(documentTemplate.isDefault, true)
            : eq(documentTemplate.id, id),
          isNotNull(documentTemplate.content),
          notDeleted,
        ),
      )
      // The defaults by preference: `language`, the app's, then any (by id).
      .orderBy(
        sql`case ${documentTemplate.language} when ${language} then 0 when ${DEFAULT_LOCALE} then 1 else 2 end`,
        asc(documentTemplate.id),
      )
      .limit(1);
    if (!found?.content) {
      return null;
    }
    return {
      ...found,
      fileName: found.fileName ?? 'template.docx',
      content: found.content,
    };
  }

  /** 400 unless documents can be made for `resource` (DocumentsModule.forFeature). */
  private checkResource(resource: string): void {
    if (!this.sources.has(resource)) {
      throw new BadRequestException(msg('documentTemplates.resource.unknown'));
    }
  }

  /**
   * Makes the other templates of `resource` in `language` not default: one
   * default per resource and language.
   */
  private async clearDefault(
    tx: Transaction,
    resource: string,
    language: Language,
    except?: number,
  ): Promise<void> {
    await tx
      .update(documentTemplate)
      .set({ isDefault: false })
      .where(
        and(
          eq(documentTemplate.resource, resource),
          eq(documentTemplate.language, language),
          eq(documentTemplate.isDefault, true),
          notDeleted,
          except === undefined ? undefined : ne(documentTemplate.id, except),
        ),
      );
  }
}

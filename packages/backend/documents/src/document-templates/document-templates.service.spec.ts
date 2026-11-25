import { schema } from '@dafne/backend-database';
import { getDrizzleToken } from '@nestjs/drizzle';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm';
import {
  documentTemplateBodySchema,
  type DocumentTemplateBodyInput,
} from '@dafne/contracts';
import { CrudHooksRegistry, type Actor } from '@dafne/backend-crud';
import { DocumentSources } from '../document-sources.js';
import { docx, paragraph } from '../testing/docx-fixtures.js';
import { DocumentTemplatesService } from './document-templates.service.js';

/** A signed-in user, as the services get it; only the id matters here. */
const actor = (id: string) => ({ id }) as Actor;

/** A body as the validation pipe hands it to the service. */
const body = (input: DocumentTemplateBodyInput) =>
  documentTemplateBodySchema.parse(input);

const { documentTemplate } = schema;
const notDeleted = isNull(documentTemplate.deletedAt);

describe('DocumentTemplatesService', () => {
  let service: DocumentTemplatesService;
  const rows = [{ id: 1 }];
  // Chainable stand-in for db.select().from().where().orderBy().limit().offset()
  const select = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
  };
  // Stand-ins for insert().values().returning() and update().set().where()
  const insert = { values: vi.fn(), returning: vi.fn() };
  const update = { set: vi.fn(), where: vi.fn() };
  const findFirst = vi.fn();
  const db = {
    transaction: vi.fn(),
    select: vi.fn(),
    $count: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    query: { documentTemplate: { findFirst } },
  };
  const found = { id: 1, resource: 'quotation', language: 'en' };
  // One resource with documents: quotation.
  const sources = new DocumentSources({ getProviders: () => [] } as never);
  const sample = vi.fn();
  sources.register('quotation', { load: vi.fn(), sample });

  beforeEach(async () => {
    vi.resetAllMocks();
    // The transaction runs on the same mock db.
    db.transaction.mockImplementation((run: (tx: typeof db) => unknown) =>
      run(db),
    );
    db.select.mockReturnValue(select);
    select.from.mockReturnValue(select);
    select.where.mockReturnValue(select);
    select.orderBy.mockReturnValue(select);
    select.limit.mockReturnValue(select);
    select.offset.mockResolvedValue(rows);
    db.$count.mockResolvedValue(42);
    db.insert.mockReturnValue(insert);
    insert.values.mockReturnValue(insert);
    insert.returning.mockResolvedValue([{ id: 1 }]);
    db.update.mockReturnValue(update);
    update.set.mockReturnValue(update);
    update.where.mockResolvedValue({ rowCount: 1 });
    findFirst.mockResolvedValue(found);
    sample.mockReturnValue({ customer: { name: 'Acme' } });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentTemplatesService,
        { provide: getDrizzleToken(), useValue: db },
        CrudHooksRegistry,
        { provide: DocumentSources, useValue: sources },
      ],
    }).compile();

    service = module.get(DocumentTemplatesService);
  });

  describe('list', () => {
    it('lists document templates that are not deleted, newest first', async () => {
      await expect(service.list()).resolves.toEqual({
        items: rows,
        total: 42,
        limit: 20,
        offset: 0,
      });
      const where = and(notDeleted);
      expect(select.from).toHaveBeenCalledWith(documentTemplate);
      expect(select.where).toHaveBeenCalledWith(where);
      expect(db.$count).toHaveBeenCalledWith(documentTemplate, where);
      expect(select.orderBy).toHaveBeenCalledWith(
        desc(documentTemplate.id),
        asc(documentTemplate.id),
      );
    });

    it('pages and sorts', async () => {
      await service.list({
        limit: 5,
        offset: 10,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(select.orderBy).toHaveBeenCalledWith(
        desc(documentTemplate.createdAt),
        asc(documentTemplate.id),
      );
      expect(select.limit).toHaveBeenCalledWith(5);
      expect(select.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('get', () => {
    it('returns a document template that is not deleted, with its users', async () => {
      await expect(service.get(1)).resolves.toBe(found);

      const options = findFirst.mock.calls[0][0];
      expect(options.where).toEqual({ id: 1, deletedAt: { isNull: true } });
      expect(options.with.createdBy.columns).toEqual({ id: true, name: true });
      expect(options.with.updatedBy.columns).toEqual({ id: true, name: true });
    });

    it('throws 404 when the document template does not exist or is deleted', async () => {
      findFirst.mockResolvedValue(undefined);

      await expect(service.get(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('inserts the document template with its creator', async () => {
      await expect(
        service.create(
          body({ name: 'Name', resource: 'quotation', language: 'it' }),
          actor('u1'),
        ),
      ).resolves.toBe(found);

      const [row] = insert.values.mock.calls[0];
      expect(row).toMatchObject({
        createdById: 'u1',
        updatedById: 'u1',
      });
      // The id the database gave it.
      expect(findFirst.mock.calls[0][0].where.id).toBe(1);
    });
  });

  describe('update', () => {
    it('updates the document template', async () => {
      await service.update(
        1,
        body({ name: 'Name', resource: 'quotation', language: 'it' }),
        actor('u2'),
      );

      expect(update.set.mock.calls[0][0]).toMatchObject({
        updatedById: 'u2',
      });
      expect(update.where).toHaveBeenCalledWith(
        and(eq(documentTemplate.id, 1), notDeleted),
      );
    });

    it('throws 404 when the document template is missing', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(
        service.update(
          999,
          body({ name: 'Name', resource: 'quotation', language: 'it' }),
          actor('u2'),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('delete', () => {
    it('sets deletedAt instead of deleting the row', async () => {
      await service.delete(1, actor('u3'));

      const values = update.set.mock.calls[0][0];
      expect(values.deletedAt).toBeInstanceOf(Date);
      expect(values.updatedById).toBe('u3');
      expect(update.where).toHaveBeenCalledWith(
        and(eq(documentTemplate.id, 1), notDeleted),
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the document template is missing or already deleted', async () => {
      update.where.mockResolvedValue({ rowCount: 0 });

      await expect(service.delete(1, actor('u3'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
  describe('resource and default', () => {
    it('refuses a resource without documents', async () => {
      await expect(
        service.create(body({ name: 'Name', resource: 'invoice', language: 'it' }), actor('u1')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.insert).not.toHaveBeenCalled();
    });

    it("makes a new default the only one of its resource and language", async () => {
      await service.create(
        body({ name: 'Name', resource: 'quotation', language: 'en', isDefault: true }),
        actor('u1'),
      );

      // First the other defaults in English are cleared, then the row is inserted.
      expect(update.set.mock.calls[0][0]).toEqual({ isDefault: false });
      expect(update.where).toHaveBeenCalledWith(
        and(
          eq(documentTemplate.resource, 'quotation'),
          eq(documentTemplate.language, 'en'),
          eq(documentTemplate.isDefault, true),
          notDeleted,
          undefined,
        ),
      );
      expect(insert.values.mock.calls[0][0]).toMatchObject({ language: 'en', isDefault: true });
    });

    it('keeps the template being edited default', async () => {
      await service.update(
        1,
        body({ name: 'Name', resource: 'quotation', language: 'it', isDefault: true }),
        actor('u2'),
      );

      expect(update.where.mock.calls[0][0]).toEqual(
        and(
          eq(documentTemplate.resource, 'quotation'),
          eq(documentTemplate.language, 'it'),
          eq(documentTemplate.isDefault, true),
          notDeleted,
          ne(documentTemplate.id, 1),
        ),
      );
    });

    it('requires a known language', () => {
      expect(() =>
        body({ name: 'Name', resource: 'quotation', language: 'de' as 'it' }),
      ).toThrow();
    });

    it('leaves the other templates alone when not default', async () => {
      await service.update(
        1,
        body({ name: 'Name', resource: 'quotation', language: 'it', isDefault: false }),
        actor('u2'),
      );

      expect(update.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('setFile', () => {
    const upload = (buffer: Buffer, originalname = 'Offerta.docx') => ({
      originalname,
      buffer,
      size: buffer.length,
    });

    it("stores a .docx that fills with the sample data in the template's language", async () => {
      const file = upload(docx(paragraph('{customer.name}')));

      await expect(
        service.setFile(1, file, actor('u2')),
      ).resolves.toBe(found);

      expect(sample).toHaveBeenCalledWith('en');
      expect(update.set.mock.calls[0][0]).toMatchObject({
        content: file.buffer,
        fileName: 'Offerta.docx',
        size: file.size,
        updatedById: 'u2',
      });
    });

    it('refuses a missing file, another format or a file too large', async () => {
      await expect(
        service.setFile(1, undefined, actor('u2')),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.setFile(1, upload(Buffer.from('x'), 'a.pdf'), actor('u2')),
      ).rejects.toMatchObject({ message: 'documentTemplates.file.notDocx' });
      await expect(
        service.setFile(
          1,
          { ...upload(Buffer.from('x')), size: 6 * 1024 * 1024 },
          actor('u2'),
        ),
      ).rejects.toMatchObject({ message: 'documentTemplates.file.tooLarge' });
      expect(db.update).not.toHaveBeenCalled();
    });

    it('refuses a template with errors, without storing it', async () => {
      await expect(
        service.setFile(1, upload(docx(paragraph('{customer.name'))), actor('u2')),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('file', () => {
    it('answers 404 for a template without a file', async () => {
      select.where.mockResolvedValue([
        { id: 1, resource: 'quotation', fileName: null, content: null },
      ]);

      await expect(service.file(1)).rejects.toMatchObject({
        message: 'documentTemplates.file.none',
      });
    });

    it("finds the resource's default, preferring the language asked for, then the app's", async () => {
      const content = Buffer.from('docx');
      select.limit.mockResolvedValue([
        { id: 3, resource: 'quotation', language: 'en', fileName: 'q.docx', content },
      ]);

      await expect(service.fileFor('quotation', 'en')).resolves.toMatchObject({
        id: 3,
        language: 'en',
        content,
      });
      expect(select.where).toHaveBeenCalledWith(
        and(
          eq(documentTemplate.resource, 'quotation'),
          eq(documentTemplate.isDefault, true),
          expect.anything(),
          notDeleted,
        ),
      );
      // Every default of the resource, the language's first, then Italian, then the others.
      const [preference] = select.orderBy.mock.calls[0] as [{ queryChunks: unknown[] }];
      expect(preference.queryChunks).toContain('en');
      expect(preference.queryChunks).toContain('it');
    });

    it('takes the template asked for, whatever its language', async () => {
      select.limit.mockResolvedValue([]);

      await expect(service.fileFor('quotation', 'en', 9)).resolves.toBeNull();
      expect(select.where).toHaveBeenCalledWith(
        and(
          eq(documentTemplate.resource, 'quotation'),
          eq(documentTemplate.id, 9),
          expect.anything(),
          notDeleted,
        ),
      );
    });
  });
});

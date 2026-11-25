import { NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@dafne/backend-session';
import type { DocumentTemplatesService } from './document-templates/document-templates.service.js';
import { DocumentSources, type DocumentSource } from './document-sources.js';
import { DocumentsService, safeFileName } from './documents.service.js';
import type { GotenbergClient } from './gotenberg.client.js';
import { docx, paragraph, paragraphs } from './testing/docx-fixtures.js';

describe('DocumentsService', () => {
  const actor = { id: 'u1' } as SessionUser;
  const source: DocumentSource = {
    load: vi.fn(),
    sample: vi.fn(),
  };
  const templates = { fileFor: vi.fn(), file: vi.fn() };
  const gotenberg = { toPdf: vi.fn() };
  let service: DocumentsService;

  beforeEach(() => {
    vi.resetAllMocks();
    const sources = new DocumentSources({ getProviders: () => [] } as never);
    sources.register('quotation', source);
    service = new DocumentsService(
      sources,
      templates as unknown as DocumentTemplatesService,
      gotenberg as unknown as GotenbergClient,
    );
    gotenberg.toPdf.mockImplementation((filled: Buffer) => Promise.resolve(filled));
  });

  it("fills the default template in the record's language with the record, in the template's language", async () => {
    vi.mocked(source.load).mockResolvedValue({ data: { id: 42, total: 1234.5 }, fileName: 'quotation-42', language: 'en' });
    templates.fileFor.mockResolvedValue({
      id: 3,
      resource: 'quotation',
      language: 'en',
      fileName: 'q.docx',
      content: docx(paragraph('Quotation {id}: {total | number:2}')),
    });

    const { pdf, fileName } = await service.render('quotation', '42', { actor, locale: 'it' });

    expect(source.load).toHaveBeenCalledWith('42', { actor, locale: 'it' });
    expect(templates.fileFor).toHaveBeenCalledWith('quotation', 'en', undefined);
    // The mock converter hands back the filled .docx, formatted in English.
    expect(paragraphs(pdf)).toEqual(['Quotation 42: 1,234.50']);
    expect(fileName).toBe('quotation-42.pdf');
  });

  it("falls back to the user's language when the record has none", async () => {
    vi.mocked(source.load).mockResolvedValue({ data: {}, fileName: 'q', language: null });
    templates.fileFor.mockResolvedValue({ id: 3, resource: 'quotation', language: 'it', fileName: 'q.docx', content: docx(paragraph('x')) });

    await service.render('quotation', '42', { actor, locale: 'en' });

    expect(templates.fileFor).toHaveBeenCalledWith('quotation', 'en', undefined);
  });

  it('uses the template asked for, in its own language', async () => {
    vi.mocked(source.load).mockResolvedValue({ data: { total: 12345.5 }, fileName: 'q', language: 'en' });
    templates.fileFor.mockResolvedValue({
      id: 7,
      resource: 'quotation',
      language: 'it',
      fileName: 'q.docx',
      content: docx(paragraph('{total | number:2}')),
    });

    const { pdf } = await service.render('quotation', '42', { actor, locale: 'en' }, 7);

    expect(templates.fileFor).toHaveBeenCalledWith('quotation', 'en', 7);
    expect(paragraphs(pdf)).toEqual(['12.345,50']);
  });

  it('answers 404 when no template was uploaded', async () => {
    vi.mocked(source.load).mockResolvedValue({ data: {}, fileName: 'q' });
    templates.fileFor.mockResolvedValue(null);

    await expect(service.render('quotation', '42', { actor, locale: 'en' })).rejects.toMatchObject({
      message: 'documents.noTemplate',
    });
    expect(gotenberg.toPdf).not.toHaveBeenCalled();
  });

  it('answers 404 for a resource without documents', async () => {
    await expect(service.render('invoice', '1', { actor, locale: 'en' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("previews a template with its resource's sample data, in the template's language", async () => {
    templates.file.mockResolvedValue({
      id: 3,
      resource: 'quotation',
      language: 'en',
      fileName: 'Offerta 2026.docx',
      content: docx(paragraph('{customer}')),
    });
    vi.mocked(source.sample).mockReturnValue({ customer: 'Acme' });

    const { pdf, fileName } = await service.preview(3);

    expect(source.sample).toHaveBeenCalledWith('en');
    expect(paragraphs(pdf)).toEqual(['Acme']);
    expect(fileName).toBe('Offerta-2026-preview.pdf');
  });
});

describe('safeFileName', () => {
  it('keeps letters, digits, dots and dashes', () => {
    expect(safeFileName('quotation "42"/x')).toBe('quotation-42-x');
    expect(safeFileName('***')).toBe('document');
  });
});

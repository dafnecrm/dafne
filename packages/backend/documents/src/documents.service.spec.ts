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

  it("fills the resource's default template with the record and converts it", async () => {
    templates.fileFor.mockResolvedValue({ id: 3, resource: 'quotation', fileName: 'q.docx', content: docx(paragraph('Quotation {id}')) });
    vi.mocked(source.load).mockResolvedValue({ data: { id: 42 }, fileName: 'quotation-42' });

    const { pdf, fileName } = await service.render('quotation', '42', { actor, locale: 'it' });

    expect(templates.fileFor).toHaveBeenCalledWith('quotation', undefined);
    expect(source.load).toHaveBeenCalledWith('42', { actor, locale: 'it' });
    // The mock converter hands back the filled .docx.
    expect(paragraphs(pdf)).toEqual(['Quotation 42']);
    expect(fileName).toBe('quotation-42.pdf');
  });

  it('uses the template asked for', async () => {
    templates.fileFor.mockResolvedValue({ id: 7, resource: 'quotation', fileName: 'q.docx', content: docx(paragraph('x')) });
    vi.mocked(source.load).mockResolvedValue({ data: {}, fileName: 'q' });

    await service.render('quotation', '42', { actor, locale: 'en' }, 7);

    expect(templates.fileFor).toHaveBeenCalledWith('quotation', 7);
  });

  it('answers 404 before loading the record when no template was uploaded', async () => {
    templates.fileFor.mockResolvedValue(null);

    await expect(service.render('quotation', '42', { actor, locale: 'en' })).rejects.toMatchObject({
      message: 'documents.noTemplate',
    });
    expect(source.load).not.toHaveBeenCalled();
  });

  it('answers 404 for a resource without documents', async () => {
    await expect(service.render('invoice', '1', { actor, locale: 'en' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("previews a template with its resource's sample data", async () => {
    templates.file.mockResolvedValue({ id: 3, resource: 'quotation', fileName: 'Offerta 2026.docx', content: docx(paragraph('{customer}')) });
    vi.mocked(source.sample).mockReturnValue({ customer: 'Acme' });

    const { pdf, fileName } = await service.preview(3, 'it');

    expect(source.sample).toHaveBeenCalledWith('it');
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

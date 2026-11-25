import { Injectable, NotFoundException } from '@nestjs/common';
import { msg } from '@dafne/contracts';
import { DocumentTemplatesService } from './document-templates/document-templates.service.js';
import { DocumentSources, type DocumentContext } from './document-sources.js';
import { fillDocx } from './docx-renderer.js';
import { GotenbergClient } from './gotenberg.client.js';

/** A PDF and the name to download it as. */
export interface RenderedDocument {
  pdf: Buffer;
  /** E.g. "quotation-42.pdf". */
  fileName: string;
}

/** Keeps a file name to what any browser and file system takes. */
export const safeFileName = (name: string) =>
  name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';

/**
 * Makes the PDF of a record: its resource's template (the default, or the
 * one asked for), filled with the record's data, converted by Gotenberg.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly sources: DocumentSources,
    private readonly templates: DocumentTemplatesService,
    private readonly gotenberg: GotenbergClient,
  ) {}

  /**
   * The PDF of the record `id` of `resource`, from the template
   * `templateId`, else the default in the record's language (the source's
   * `language`, else `context.locale`; see DocumentTemplatesService.fileFor).
   * Filled and formatted in the template's language. 404 when the resource
   * isn't registered, the record is missing (the source's rules) or no
   * template with a file is there for it.
   */
  async render(
    resource: string,
    id: string,
    context: DocumentContext,
    templateId?: number,
  ): Promise<RenderedDocument> {
    const source = this.sources.get(resource);
    // First the record: its language picks the template.
    const { data, fileName, language } = await source.load(id, context);
    const template = await this.templates.fileFor(resource, language ?? context.locale, templateId);
    if (!template) {
      throw new NotFoundException(msg('documents.noTemplate'));
    }
    const pdf = await this.gotenberg.toPdf(fillDocx(template.content, data, template.language));
    return { pdf, fileName: `${safeFileName(fileName)}.pdf` };
  }

  /** A template filled with its resource's sample data, in its language, as a PDF. */
  async preview(templateId: number): Promise<RenderedDocument> {
    const template = await this.templates.file(templateId);
    const data = this.sources.get(template.resource).sample(template.language);
    const pdf = await this.gotenberg.toPdf(fillDocx(template.content, data, template.language));
    return { pdf, fileName: `${safeFileName(template.fileName.replace(/\.docx$/i, ''))}-preview.pdf` };
  }
}

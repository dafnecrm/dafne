import { Controller, Get, Headers, Param, Query, StreamableFile } from '@nestjs/common';
import { localeFrom, ZodValidationPipe } from '@dafne/backend-common';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { renderDocumentQuerySchema, type RenderDocumentQuery } from '@dafne/contracts';
import { DocumentsService, type RenderedDocument } from './documents.service.js';

/** A PDF response, shown in the browser (inline) with its file name. */
export function pdfFile({ pdf, fileName }: RenderedDocument): StreamableFile {
  return new StreamableFile(pdf, {
    type: 'application/pdf',
    disposition: `inline; filename="${fileName}"`,
    length: pdf.length,
  });
}

/**
 * The documents of every resource registered with
 * `DocumentsModule.forFeature`, for any signed-in user who can read the
 * record (the source checks it).
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  /** The PDF of one record, from `?template=` or the resource's default template. */
  @Get(':resource/:id/pdf')
  async pdf(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Query(new ZodValidationPipe(renderDocumentQuerySchema)) query: RenderDocumentQuery,
    @Session() session: UserSession,
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): Promise<StreamableFile> {
    const locale = localeFrom(acceptLanguage);
    return pdfFile(await this.documents.render(resource, id, { actor: session.user, locale }, query.template));
  }
}

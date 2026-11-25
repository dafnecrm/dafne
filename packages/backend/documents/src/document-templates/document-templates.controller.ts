import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Can } from '@dafne/backend-permissions';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, localeFrom, ZodValidationPipe } from '@dafne/backend-common';
import {
  documentTemplateBodySchema,
  listDocumentTemplatesQuerySchema,
  DOCUMENT_TEMPLATE_MAX_BYTES,
  DOCX_MEDIA_TYPE,
  type DocumentResource,
  type DocumentTemplateBody,
  type DocumentTemplateDetail,
  type DocumentTemplatesList,
  type ListDocumentTemplatesQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { DocumentTemplatesService, type UploadedTemplate } from './document-templates.service.js';
import { DocumentSources } from '../document-sources.js';
import { DocumentsService } from '../documents.service.js';
import { pdfFile } from '../documents.controller.js';

/**
 * The Word templates of the documents, uploaded by admins (or groups
 * allowed DocumentTemplate.*). Reading them is open to every signed-in user
 * (the global auth guard checks it), like every resource of the app.
 */
@Controller('document-templates')
export class DocumentTemplatesController implements CrudController<
  number,
  ListDocumentTemplatesQuery,
  DocumentTemplatesList,
  DocumentTemplateBody,
  DocumentTemplateDetail
> {
  constructor(
    private readonly documentTemplatesService: DocumentTemplatesService,
    private readonly sources: DocumentSources,
    private readonly documents: DocumentsService,
  ) {}

  /** The resources templates can be made for, with the tags each can use. */
  @Get('resources')
  resources(
    @Headers('accept-language') acceptLanguage: string | undefined,
  ): DocumentResource[] {
    return this.sources.list(localeFrom(acceptLanguage));
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listDocumentTemplatesQuerySchema))
    query: ListDocumentTemplatesQuery,
  ): Promise<DocumentTemplatesList> {
    return this.documentTemplatesService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<DocumentTemplateDetail> {
    return this.documentTemplatesService.get(id);
  }

  @Post()
  @Can('create', 'DocumentTemplate')
  create(
    @Body(new ZodValidationPipe(documentTemplateBodySchema))
    body: DocumentTemplateBody,
    @Session() session: UserSession,
  ): Promise<DocumentTemplateDetail> {
    return this.documentTemplatesService.create(body, session.user);
  }

  @Put(':id')
  @Can('update', 'DocumentTemplate')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(documentTemplateBodySchema))
    body: DocumentTemplateBody,
    @Session() session: UserSession,
  ): Promise<DocumentTemplateDetail> {
    return this.documentTemplatesService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @Can('delete', 'DocumentTemplate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.documentTemplatesService.delete(id, session.user);
  }

  /** Uploads the .docx of a template (multipart, field `file`), replacing its file. */
  @Put(':id/file')
  @Can('update', 'DocumentTemplate')
  @UseInterceptors(
    // One byte more than the limit, so the service tells "too large".
    FileInterceptor('file', {
      limits: { fileSize: DOCUMENT_TEMPLATE_MAX_BYTES + 1, files: 1 },
    }),
  )
  setFile(
    @Param('id', IdPipe) id: number,
    @UploadedFile() file: UploadedTemplate | undefined,
    @Session() session: UserSession,
  ): Promise<DocumentTemplateDetail> {
    return this.documentTemplatesService.setFile(id, file, session.user);
  }

  /** Downloads the .docx of a template. */
  @Get(':id/file')
  async file(@Param('id', IdPipe) id: number): Promise<StreamableFile> {
    const { content, fileName } = await this.documentTemplatesService.file(id);
    return new StreamableFile(content, {
      type: DOCX_MEDIA_TYPE,
      disposition: `attachment; filename="${fileName.replace(/[^\w.-]+/g, '-')}"`,
      length: content.length,
    });
  }

  /** The template filled with its resource's sample data, in its language, as a PDF. */
  @Get(':id/preview')
  async preview(@Param('id', IdPipe) id: number): Promise<StreamableFile> {
    return pdfFile(await this.documents.preview(id));
  }
}

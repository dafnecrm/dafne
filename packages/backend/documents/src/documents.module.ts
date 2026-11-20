import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { PermissionsModule } from '@dafne/backend-permissions';
import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { DocumentTemplatesController } from './document-templates/document-templates.controller.js';
import { DocumentTemplatesService } from './document-templates/document-templates.service.js';
import { DocumentSources } from './document-sources.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { GotenbergClient } from './gotenberg.client.js';

/**
 * PDFs of records from Word templates that admins upload
 * (`/document-templates`), filled with docxtemplater and converted by
 * Gotenberg (GOTENBERG_URL). A resource gets documents with a provider of
 * its own module marked `@DocumentSourceFor('quotation')` (a
 * `DocumentSource`): `GET /documents/quotation/:id/pdf` uses it.
 */
@Module({
  imports: [DatabaseModule, CrudHooksModule, PermissionsModule, DiscoveryModule],
  controllers: [DocumentTemplatesController, DocumentsController],
  providers: [DocumentSources, DocumentTemplatesService, DocumentsService, GotenbergClient],
  exports: [DocumentSources, DocumentTemplatesService, DocumentsService],
})
export class DocumentsModule {}

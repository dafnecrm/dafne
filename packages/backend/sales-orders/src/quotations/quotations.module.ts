import { ChangelogModule } from '@dafne/backend-changelog';
import { CrudHooksModule } from '@dafne/backend-crud';
import { CustomersModule } from '@dafne/backend-customers';
import { DocumentsModule } from '@dafne/backend-documents';
import { DatabaseModule } from '@dafne/backend-database';
import { NotificationsModule } from '@dafne/backend-notifications';
import { FsmModule } from '@dafne/backend-fsm';
import { PermissionsModule } from '@dafne/backend-permissions';
import { ProductsModule } from '@dafne/backend-products';
import type { QuotationDetail, QuotationStatus } from '@dafne/contracts';
import { Module } from '@nestjs/common';
import { SalesOrdersModule } from '../sales-orders.module.js';
import { QuotationsService } from './quotations.service.js';
import { QuotationsController } from './quotations.controller.js';
import { QuotationTransition } from './quotation.transition.js';
import { QUOTATION_STATE_MACHINE, QUOTATION_STATES } from './quotation.states.js';
import { QUOTATIONS_RESOURCE, QUOTATION_CHANGELOG, QuotationStatusChangelog } from './quotation.changelog.js';
import { QuotationIsDraftHook } from './quotation.hooks.js';
import { QuotationDocumentSource } from './quotation.document.js';

/**
 * Quotations and their state machine: accepting one creates its sales
 * order (CreateSalesOrderFromQuotation, with SalesOrdersService). Their PDFs
 * come from the templates admins upload (GET /documents/quotation/:id/pdf).
 */
@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    PermissionsModule,
    // ProductsService: the units an item's product is sold in.
    ProductsModule,
    CrudHooksModule,
    CrudHooksModule.forFeature(QUOTATIONS_RESOURCE, {
      update: {
        pre: [QuotationIsDraftHook],
      },
    }),
    // The change log: the CRUD writes, and (below) every status change.
    ChangelogModule,
    ChangelogModule.forFeature<QuotationDetail>(QUOTATIONS_RESOURCE, QUOTATION_CHANGELOG),
    FsmModule.forFeature<QuotationStatus, number>({
      name: QUOTATION_STATE_MACHINE,
      transition: QuotationTransition,
      states: QUOTATION_STATES,
      imports: [ChangelogModule, SalesOrdersModule, NotificationsModule, DocumentsModule,],
      post: [QuotationStatusChangelog],
    }),
    // The PDF (QuotationDocumentSource): a quotation and its customer,
    // filled into the template admins uploaded.
    DocumentsModule,
    CustomersModule,
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService, QuotationDocumentSource],
  exports: [QuotationsService],
})
export class QuotationsModule {}

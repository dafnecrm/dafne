import { ChangelogModule } from '@dafne/backend-changelog';
import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
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

/**
 * Quotations and their state machine: accepting one creates its sales
 * order (CreateSalesOrderFromQuotation, with SalesOrdersService).
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
      imports: [ChangelogModule, SalesOrdersModule],
      post: [QuotationStatusChangelog],
    }),
  ],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}

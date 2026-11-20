import { ChangelogModule } from '@dafne/backend-changelog';
import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { FsmModule } from '@dafne/backend-fsm';
import type { SalesOrderDetail, SalesOrderStatus } from '@dafne/contracts';
import { Module } from '@nestjs/common';
import { PermissionsModule } from '@dafne/backend-permissions';
import { ProductsModule } from '@dafne/backend-products';
import { SalesOrdersService } from './sales-orders.service.js';
import { SalesOrdersController } from './sales-orders.controller.js';
import { SalesOrderTransition } from './sales-order.transition.js';
import { SALES_ORDER_STATE_MACHINE, SALES_ORDER_STATES } from './sales-order.states.js';
import { SALES_ORDER_CHANGELOG, SALES_ORDERS_RESOURCE, SalesOrderStatusChangelog } from './sales-order.changelog.js';
import { SalesOrderIsDraftHook } from './sales-order.hooks.js';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    PermissionsModule,
    // ProductsService: the units an item's product is sold in.
    ProductsModule,
    CrudHooksModule,
    CrudHooksModule.forFeature(SALES_ORDERS_RESOURCE, {
      update: {
        pre: [SalesOrderIsDraftHook],
      },
    }),
    // The change log: the CRUD writes, and (below) every status change.
    ChangelogModule,
    ChangelogModule.forFeature<SalesOrderDetail>(SALES_ORDERS_RESOURCE, SALES_ORDER_CHANGELOG),
    FsmModule.forFeature<SalesOrderStatus, number>({
      name: SALES_ORDER_STATE_MACHINE,
      transition: SalesOrderTransition,
      states: SALES_ORDER_STATES,
      imports: [ChangelogModule],
      post: [SalesOrderStatusChangelog],
    }),
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

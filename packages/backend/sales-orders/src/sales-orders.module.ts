import { DatabaseModule } from '@dafne/backend-database';
import { FsmModule } from '@dafne/backend-fsm';
import type { SalesOrderStatus } from '@dafne/contracts';
import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { SalesOrdersController } from './sales-orders.controller.js';
import { SalesOrderTransition } from './sales-order.transition.js';
import { SALES_ORDER_STATE_MACHINE, SALES_ORDER_STATES } from './sales-order.states.js';

@Module({
  imports: [
    DatabaseModule,
    FsmModule.forFeature<SalesOrderStatus, number>({
      name: SALES_ORDER_STATE_MACHINE,
      transition: SalesOrderTransition,
      states: SALES_ORDER_STATES,
    }),
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

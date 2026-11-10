import { schema } from '@dafne/backend-database';
import type { TransitionContext, TransitionGuard } from '@dafne/backend-fsm';
import type { SalesOrderStatus } from '@dafne/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';

/** A sales order needs at least one item to leave draft. */
@Injectable()
export class SalesOrderHasItemsGuard implements TransitionGuard<SalesOrderStatus, number> {
  logger = new Logger(SalesOrderHasItemsGuard.name)
  async canTransition({ id, tx }: TransitionContext<SalesOrderStatus, number>): Promise<boolean> {
    const count = await tx.$count(schema.salesOrderItem, eq(schema.salesOrderItem.orderId, id))
    return count > 0;
  }
}

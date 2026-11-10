import { schema } from '@dafne/backend-database';
import type { TransitionContext, TransitionGuard, TransitionGuardResult } from '@dafne/backend-fsm';
import { msg, type SalesOrderStatus } from '@dafne/contracts';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

/** A sales order needs at least one item to leave draft. */
@Injectable()
export class SalesOrderHasItemsGuard implements TransitionGuard<SalesOrderStatus, number> {
  async canTransition({ id, tx }: TransitionContext<SalesOrderStatus, number>): Promise<TransitionGuardResult> {
    const count = await tx.$count(schema.salesOrderItem, eq(schema.salesOrderItem.orderId, id));
    return count > 0 || msg('salesOrders.items.enterAtLeastOneItem');
  }
}

import { schema } from '@dafne/backend-database';
import type { TransitionContext, TransitionGuard, TransitionGuardResult } from '@dafne/backend-fsm';
import { msg, type SalesOrderStatus, CUSTOMER_ADDRESS_TYPES } from '@dafne/contracts';
import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

/** A sales order needs at least one item to leave draft. */
@Injectable()
export class SalesOrderHasItemsGuard implements TransitionGuard<SalesOrderStatus, number> {
  async canTransition({ id, tx }: TransitionContext<SalesOrderStatus, number>): Promise<TransitionGuardResult> {
    const count = await tx.$count(schema.salesOrderItem, eq(schema.salesOrderItem.orderId, id));
    return count > 0 || msg('salesOrders.items.enterAtLeastOneItem');
  }
}

/** A sales order needs at least one item to leave draft. */
@Injectable()
export class SalesOrderCustomerHasShippingAddress implements TransitionGuard<SalesOrderStatus, number> {
  async canTransition({ id, tx }: TransitionContext<SalesOrderStatus, number>): Promise<TransitionGuardResult> {
    const so = await tx
      .select({
        customerId: schema.customer.id
      })
      .from(schema.salesOrder)
      .innerJoin(schema.customer, eq(schema.customer.id, schema.salesOrder.customerId))
      .where(eq(schema.salesOrder.id, id));

    if (so.length === 0) {
      return msg('salesOrders.notFound')
    }

    if (!so[0].customerId) {
      return msg('salesOrders.customerId.notFound')
    }

    const count = await tx.$count(schema.customerAddress, and(
      eq(schema.customerAddress.customerId, so[0].customerId),
      eq(schema.customerAddress.type, 'shipping')
    ));

    return count > 0 || msg('salesOrders.customer.noShippingAddress');
  }
}

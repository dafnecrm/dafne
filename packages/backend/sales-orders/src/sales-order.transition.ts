import { schema } from '@dafne/backend-database';
import { StateTransition, type Transaction, type TransitionContext } from '@dafne/backend-fsm';
import { msg, type SalesOrderStatus } from '@dafne/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

const { salesOrder } = schema;

/** Reads and writes the status of sales orders that aren't deleted. */
@Injectable()
export class SalesOrderTransition extends StateTransition<SalesOrderStatus, number> {
  async currentStatus(id: number, tx: Transaction): Promise<SalesOrderStatus> {
    // FOR UPDATE: a second change of the same order waits for this one.
    const [found] = await tx
      .select({ status: salesOrder.status })
      .from(salesOrder)
      .where(and(eq(salesOrder.id, id), isNull(salesOrder.deletedAt)))
      .for('update');
    if (!found) {
      throw new NotFoundException(msg('salesOrders.notFound'));
    }
    return found.status;
  }

  async execute({ id, to, tx, user }: TransitionContext<SalesOrderStatus, number>): Promise<void> {
    await tx
      .update(salesOrder)
      .set({ status: to, updatedAt: new Date(), ...(user && { updatedById: user.id }) })
      .where(eq(salesOrder.id, id));
  }
}

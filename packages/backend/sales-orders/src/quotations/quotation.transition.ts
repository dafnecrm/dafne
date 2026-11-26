import { schema } from '@dafne/backend-database';
import { StateTransition, type Transaction, type TransitionContext } from '@dafne/backend-fsm';
import { msg, type QuotationStatus } from '@dafne/contracts';
import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

const { quotation } = schema;

/** The quotations' state machine, to inject with @InjectStateMachine. */
export const QUOTATION_STATE_MACHINE = 'quotation';

/** Reads and writes the status of quotations that aren't deleted. */
@Injectable()
export class QuotationTransition extends StateTransition<QuotationStatus, number> {
  async currentStatus(id: number, tx: Transaction): Promise<QuotationStatus> {
    // FOR UPDATE: a second change of the same quotation (a second accept) waits for this one.
    const [found] = await tx
      .select({ status: quotation.status })
      .from(quotation)
      .where(and(eq(quotation.id, id), isNull(quotation.deletedAt)))
      .for('update');
    if (!found) {
      throw new NotFoundException(msg('quotations.notFound'));
    }
    return found.status;
  }

  async execute({ id, to, tx, user }: TransitionContext<QuotationStatus, number>): Promise<void> {
    await tx
      .update(quotation)
      .set({ 
        status: to, 
        acceptedAt: to === 'accepted' ? new Date() : undefined,
        rejectedAt: to === 'rejected' ? new Date() : undefined,
        updatedAt: new Date(), 
        ...(user && { updatedById: user.id }) 
      })
      .where(eq(quotation.id, id));
  }
}

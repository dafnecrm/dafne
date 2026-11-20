import { schema } from '@dafne/backend-database';
import type { TransitionContext, TransitionGuard, TransitionGuardResult } from '@dafne/backend-fsm';
import { msg, type QuotationStatus } from '@dafne/contracts';
import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

/** A quotation needs at least one item to be sent (and accepted). */
@Injectable()
export class QuotationHasItemsGuard implements TransitionGuard<QuotationStatus, number> {
  async canTransition({ id, tx }: TransitionContext<QuotationStatus, number>): Promise<TransitionGuardResult> {
    const count = await tx.$count(schema.quotationItem, eq(schema.quotationItem.quotationId, id));
    return count > 0 || msg('quotations.items.enterAtLeastOneItem');
  }
}

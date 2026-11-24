import type { TransitionContext, TransitionHook, TransitionHookResult } from '@dafne/backend-fsm';
import { msg, type SalesOrderBody, type SalesOrderDetail, type SalesOrderStatus } from '@dafne/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { SALES_ORDER_CHANGELOG } from './sales-order.changelog.js';
import { draftOnlyHook } from './items/document-hooks.js';

type Context = TransitionContext<SalesOrderStatus, number>;

/** Example pre hook: logs the transition before it runs. */
@Injectable()
export class SalesOrderLogPreHook implements TransitionHook<SalesOrderStatus, number> {
  private readonly logger = new Logger(SalesOrderLogPreHook.name);

  run({ id, from, to, user }: Context): TransitionHookResult {
    this.logger.log(`Sales order ${id}: ${from} → ${to} starting (user ${user?.id ?? '-'}) - pre hook`);
  }
}

/** Example post hook: logs the transition once it's done (still in its transaction). */
@Injectable()
export class SalesOrderLogPostHook implements TransitionHook<SalesOrderStatus, number> {
  private readonly logger = new Logger(SalesOrderLogPostHook.name);

  run({ id, from, to }: Context): void {
    this.logger.log(`Sales order ${id}: ${from} → ${to} done - post hook`);
  }
}

/**
 * Pre hook of update: a sales order that isn't a draft may change only its
 * notes. The status isn't compared: the state machine checks its changes.
 */
export const SalesOrderIsDraftHook = draftOnlyHook<SalesOrderBody, SalesOrderDetail>(
  SALES_ORDER_CHANGELOG,
  msg('salesOrders.status.mustBeDraft'),
);

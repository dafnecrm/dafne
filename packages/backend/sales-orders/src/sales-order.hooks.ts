import { diff, snapshot } from '@dafne/backend-changelog';
import type { CrudHook, CrudHookContext, CrudHookResult } from '@dafne/backend-crud';
import type { TransitionContext, TransitionHook, TransitionHookResult } from '@dafne/backend-fsm';
import { msg, type SalesOrderBody, type SalesOrderDetail, type SalesOrderStatus } from '@dafne/contracts';
import { Injectable, Logger } from '@nestjs/common';
import { SALES_ORDER_CHANGELOG } from './sales-order.changelog.js';

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

/** Fields a sales order that isn't a draft may still change. */
const EDITABLE_WHEN_NOT_DRAFT = new Set<string>(['notes']);

/**
 * Pre hook of update: a sales order that isn't a draft may change only its
 * notes. The status isn't compared: the state machine checks its changes.
 */
@Injectable()
export class SalesOrderIsDraftHook implements CrudHook<number, SalesOrderBody, SalesOrderDetail> {
  run({ previous, body }: CrudHookContext<number, SalesOrderBody, SalesOrderDetail>): CrudHookResult {
    if (!previous || !body || previous.status === 'draft') {
      return;
    }
    // An item without a unit is in its product's base unit: the previous
    // items say which one (a product they don't have is a change anyway).
    const baseUnits = new Map(previous.items.map((item) => [item.productId, item.product.uom.id]));
    const items = body.items.map((item) => ({
      ...item,
      uomId: item.uomId ?? baseUnits.get(item.productId) ?? null,
    }));
    const changed = Object.keys(
      diff(
        snapshot(previous, SALES_ORDER_CHANGELOG),
        // The body has the same fields (items without the product's name): snapshot maps them alike.
        snapshot({ ...body, items } as unknown as SalesOrderDetail, SALES_ORDER_CHANGELOG),
      ),
    );
    if (changed.some((field) => !EDITABLE_WHEN_NOT_DRAFT.has(field))) {
      return msg('salesOrders.status.mustBeDraft');
    }
  }
}

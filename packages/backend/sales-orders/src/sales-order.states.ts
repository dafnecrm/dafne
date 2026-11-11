import type { StatesConfig } from '@dafne/backend-fsm';
import type { SalesOrderStatus } from '@dafne/contracts';
import { SalesOrderCustomerHasShippingAddress, SalesOrderHasItemsGuard } from './sales-order.guards.js';
import { SalesOrderLogPostHook, SalesOrderLogPreHook } from './sales-order.hooks.js';

/** The sales orders' state machine, to inject with @InjectStateMachine. */
export const SALES_ORDER_STATE_MACHINE = 'salesOrder';

/** The statuses a sales order can move to; completed, cancelled and rejected are final. */
export const SALES_ORDER_STATES: StatesConfig<SalesOrderStatus, number> = {
  draft: {
    open: {
      guards: [SalesOrderHasItemsGuard, SalesOrderCustomerHasShippingAddress],
      pre: [SalesOrderLogPreHook],
      post: [SalesOrderLogPostHook],
    },
  },
  open: {
    completed: {},
    cancelled: {},
    rejected: {},
  },
};

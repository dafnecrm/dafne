import { changelogTransitionHook, type ChangelogOptions } from '@dafne/backend-changelog';
import type { SalesOrderDetail } from '@dafne/contracts';

/** The resource's name in the change log (and in CrudHooks). */
export const SALES_ORDERS_RESOURCE = 'sales-orders';

/**
 * What the change log keeps of a sales order. Not the status: the state
 * machine logs its changes (SalesOrderStatusChangelog), once each.
 */
export const SALES_ORDER_CHANGELOG: ChangelogOptions<SalesOrderDetail> = {
  fields: ['notes', 'customerId', 'typeId', 'items'],
  map: {
    // The order's own data, by position: not the product's name.
    items: (items) =>
      items
        .map(({ position, productId, quantity }) => ({ position, productId, quantity }))
        .sort((a, b) => a.position - b.position),
  },
};

/** Logs the status changes of sales orders (a hook of every transition). */
export const SalesOrderStatusChangelog = changelogTransitionHook(SALES_ORDERS_RESOURCE);

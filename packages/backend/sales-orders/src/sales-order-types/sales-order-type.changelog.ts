import type { ChangelogOptions } from '@dafne/backend-changelog';
import type { SalesOrderTypeDetail } from '@dafne/contracts';

/** The resource's name in the change log (and in CrudHooks). */
export const SALES_ORDER_TYPES_RESOURCE = 'sales-order-types';

/**
 * What the change log keeps of a sales order type: the fields whose changes are
 * logged (`map` logs a field otherwise than as it is, e.g. a list sorted).
 */
export const SALES_ORDER_TYPE_CHANGELOG: ChangelogOptions<SalesOrderTypeDetail> =
  {
    fields: ['id', 'description', 'active'],
  };

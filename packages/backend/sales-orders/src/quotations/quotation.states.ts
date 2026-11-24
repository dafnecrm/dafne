import type { StatesConfig } from '@dafne/backend-fsm';
import type { QuotationStatus } from '@dafne/contracts';
import { QuotationHasItemsGuard } from './quotation.guards.js';
import { CreateSalesOrderFromQuotation, SendQuotationPdfToCustomer } from './quotation.hooks.js';

// In the transition's file: the service needs it, and these states need hooks that need the service.
export { QUOTATION_STATE_MACHINE } from './quotation.transition.js';

/**
 * The statuses a quotation can move to; accepted, rejected and expired are
 * final. Accepting it creates its sales order, in the same transaction.
 */
export const QUOTATION_STATES: StatesConfig<QuotationStatus, number> = {
  draft: {
    sent: { guards: [QuotationHasItemsGuard], post: [SendQuotationPdfToCustomer] },
  },
  sent: {
    draft: {},
    accepted: { guards: [QuotationHasItemsGuard], post: [CreateSalesOrderFromQuotation] },
    rejected: {},
    expired: {},
  },
};

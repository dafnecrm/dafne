import { changelogTransitionHook, type ChangelogOptions } from '@dafne/backend-changelog';
import type { QuotationDetail } from '@dafne/contracts';
import { loggedItems } from '../items/document-hooks.js';

/** The resource's name in the change log (and in CrudHooks). */
export const QUOTATIONS_RESOURCE = 'quotations';

/**
 * What the change log keeps of a quotation. Not the status: the state
 * machine logs its changes (QuotationStatusChangelog), once each.
 */
export const QUOTATION_CHANGELOG: ChangelogOptions<QuotationDetail> = {
  fields: ['notes', 'customerId', 'typeId', 'validUntil', 'items'],
  map: { items: loggedItems },
};

/** Logs the status changes of quotations (a hook of every transition). */
export const QuotationStatusChangelog = changelogTransitionHook(QUOTATIONS_RESOURCE);

import { type ChangelogOptions } from '@dafne/backend-changelog';
import type { CustomerDetail } from '@dafne/contracts';

/** The resource's name in the change log (and in CrudHooks). */
export const CUSTOMERS_RESOURCE = 'customers';

/**
 * What the change log keeps of a customer. Not the status: the state
 * machine logs its changes (CustomerStatusChangelog), once each.
 */
export const CUSTOMER_CHANGELOG: ChangelogOptions<CustomerDetail> = {
  fields: ['name', 'type', 'addresses', 'email', 'phone'],
  map: {
    addresses: (addresses) =>
      addresses
        .map(({ type, street, city, postalCode, countryCode }) => ({ type, street, city, postalCode, countryCode }))
        .sort((a, b) => a.type > b.type ? 1 : -1),
  },
};

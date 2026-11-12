import type { ChangelogOptions } from '@dafne/backend-changelog';
import type { ProductDetail } from '@dafne/contracts';

/** The resource's name in the change log (and in CrudHooks). */
export const PRODUCTS_RESOURCE = 'products';

/**
 * What the change log keeps of a product: the fields whose changes are
 * logged (`map` logs a field otherwise than as it is, e.g. a list sorted).
 */
export const PRODUCT_CHANGELOG: ChangelogOptions<ProductDetail> = {
  fields: ['name', 'description', 'price'],
};

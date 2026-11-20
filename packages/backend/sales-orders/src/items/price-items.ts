import type { Transaction } from '@dafne/backend-crud';
import { msg, multiplyDecimal, type ProductSaleUnit, type SalesOrderItemBody } from '@dafne/contracts';
import type { ProductsService } from '@dafne/backend-products';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/*
 * The items of documents with products (sales orders, quotations): the same
 * body, the same columns, priced the same way. Each document inserts the
 * rows into its own table, with its own key.
 */

/** An item as saved, with its price: one that comes back unchanged keeps it. */
export interface PricedItem {
  position: number;
  productId: number;
  uomId: string;
  quantity: number;
  price: number;
}

/** An item ready to insert, without its document's key. */
export interface ItemRow extends PricedItem {
  baseQuantity: number;
}

/** Quantities are numeric(18,6): the base one is rounded to that scale. */
export const roundQuantity = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Prices the items of a document. Each quantity is in the item's unit (the
 * product's base unit when left out), which must be one the product is sold
 * in: its base quantity and price (the product's price × the base quantity)
 * are computed from it. An item of `previous` with the same position,
 * product, unit and quantity keeps its price, so saving a document again
 * doesn't reprice it (and a copy keeps the prices of what it copies). 400
 * when the product doesn't exist or can't be sold in that unit.
 */
export async function priceItems(
  products: ProductsService,
  tx: Transaction,
  items: SalesOrderItemBody[],
  previous: PricedItem[] = [],
): Promise<ItemRow[]> {
  // Each product's units, read once however many items have it.
  const units = new Map<number, Promise<ProductSaleUnit[] | null>>();
  const unitsOf = (productId: number) => {
    let found = units.get(productId);
    if (!found) {
      found = products.units(productId, tx).catch((error: unknown) => {
        if (error instanceof NotFoundException) {
          return null;
        }
        throw error;
      });
      units.set(productId, found);
    }
    return found;
  };

  const rows: ItemRow[] = [];
  for (const [index, item] of items.entries()) {
    const productUnits = await unitsOf(item.productId);
    if (!productUnits) {
      throw new BadRequestException([`items.${index}.productId: ${msg('salesOrders.items.productId.notFound')}`]);
    }
    // The base unit comes first.
    const unit = item.uomId ? productUnits.find((candidate) => candidate.uomId === item.uomId) : productUnits[0];
    if (!unit) {
      throw new BadRequestException([`items.${index}.uomId: ${msg('salesOrders.items.uomId.notConvertible')}`]);
    }
    const baseQuantity = roundQuantity(item.quantity * unit.factor);
    const kept = previous.find(
      (old) =>
        old.position === item.position &&
        old.productId === item.productId &&
        old.uomId === unit.uomId &&
        old.quantity === item.quantity,
    );
    rows.push({
      productId: item.productId,
      quantity: item.quantity,
      uomId: unit.uomId,
      baseQuantity,
      // The base unit (its price, the product's) comes first.
      price: kept?.price ?? multiplyDecimal(productUnits[0].price, baseQuantity, 2),
      position: item.position,
    });
  }
  return rows;
}

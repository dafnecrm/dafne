import { diff, snapshot, type ChangelogOptions } from '@dafne/backend-changelog';
import type { CrudHook, CrudHookContext, CrudHookResult } from '@dafne/backend-crud';
import type { ContractMessageKey, SalesOrderDetailItem, SalesOrderItemBody } from '@dafne/contracts';
import { Injectable, type Type } from '@nestjs/common';

/** What a document with items (a sales order, a quotation) has in common. */
interface ItemsBody {
  items: SalesOrderItemBody[];
}
interface ItemsDetail {
  status: string;
  items: SalesOrderDetailItem[];
}

/**
 * How the change log keeps a document's items: its own data, by position
 * (not the product's name).
 */
export const loggedItems = (items: SalesOrderDetailItem[]) =>
  items
    .map(({ position, productId, quantity, uomId }) => ({ position, productId, quantity, uomId }))
    .sort((a, b) => a.position - b.position);

/**
 * A pre hook of update: a document that isn't a draft may change only the
 * fields of `editable` (its notes); anything else fails with `message`. The
 * fields compared are the logged ones (`changelog`). The status isn't: the
 * state machine checks its changes.
 */
export function draftOnlyHook<Body extends ItemsBody, Detail extends ItemsDetail>(
  changelog: ChangelogOptions<Detail>,
  message: ContractMessageKey,
  editable: readonly string[] = ['notes'],
): Type<CrudHook<number, Body, Detail>> {
  const allowed = new Set(editable);

  @Injectable()
  class DraftOnlyHook implements CrudHook<number, Body, Detail> {
    run({ previous, body }: CrudHookContext<number, Body, Detail>): CrudHookResult {
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
          snapshot(previous, changelog),
          // The body has the same fields (items without the product's name): snapshot maps them alike.
          snapshot({ ...body, items } as unknown as Detail, changelog),
        ),
      );
      if (changed.some((field) => !allowed.has(field))) {
        return message;
      }
    }
  }
  return DraftOnlyHook;
}

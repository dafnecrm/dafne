import { CrudHook, CrudHookContext, CrudHookResult } from "@dafne/backend-crud";
import { msg } from "@dafne/contracts";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ProductNotUsedHook implements CrudHook<number> {
    async run(context: CrudHookContext<number>): Promise<CrudHookResult> {
        const db = context.tx;
        const soit = await db.query.salesOrderItem.findFirst({
            columns: { productId: true },
            where: { productId: context.id }
        })

        if (soit) {
            return msg('products.used');
        }
    }
}
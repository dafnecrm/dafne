import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { UserGroupsModule } from '@dafne/backend-user-groups';
import { UomConversionsModule } from '@dafne/backend-uom';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { ChangelogModule } from '@dafne/backend-changelog';
import type { ProductDetail } from '@dafne/contracts';
import { PRODUCTS_RESOURCE, PRODUCT_CHANGELOG } from './product.changelog.js';
import { ProductNotUsedHook } from './product-not-used.crud-hook.ts';

@Module({
  imports: [
    DatabaseModule,
    // @Can() on the controller: AbilityGuard and the permissions.
    UserGroupsModule,
    // UomConversionsService: the units a product's base unit converts to.
    UomConversionsModule,
    CrudHooksModule,
    CrudHooksModule.forFeature(PRODUCTS_RESOURCE, {
      delete: {
        pre: [ProductNotUsedHook]
      }
    }),
    ChangelogModule,
    ChangelogModule.forFeature<ProductDetail>(
      PRODUCTS_RESOURCE,
      PRODUCT_CHANGELOG,
    ),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

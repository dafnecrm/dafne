import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { ChangelogModule } from '@dafne/backend-changelog';
import type { ProductDetail } from '@dafne/contracts';
import { PRODUCTS_RESOURCE, PRODUCT_CHANGELOG } from './product.changelog.js';

@Module({
  imports: [
    DatabaseModule,
    CrudHooksModule,
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

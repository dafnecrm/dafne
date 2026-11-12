import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { SalesOrderTypesService } from './sales-order-types.service.js';
import { SalesOrderTypesController } from './sales-order-types.controller.js';
import { ChangelogModule } from '@dafne/backend-changelog';
import type { SalesOrderTypeDetail } from '@dafne/contracts';
import {
  SALES_ORDER_TYPES_RESOURCE,
  SALES_ORDER_TYPE_CHANGELOG,
} from './sales-order-type.changelog.js';

@Module({
  imports: [
    DatabaseModule,
    CrudHooksModule,
    ChangelogModule,
    ChangelogModule.forFeature<SalesOrderTypeDetail>(
      SALES_ORDER_TYPES_RESOURCE,
      SALES_ORDER_TYPE_CHANGELOG,
    ),
  ],
  controllers: [SalesOrderTypesController],
  providers: [SalesOrderTypesService],
  exports: [SalesOrderTypesService],
})
export class SalesOrderTypesModule {}

import { CrudHooksModule } from '@dafne/backend-crud';
import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { SalesOrderTypesService } from './sales-order-types.service.js';
import { SalesOrderTypesController } from './sales-order-types.controller.js';

@Module({
  imports: [DatabaseModule, CrudHooksModule],
  controllers: [SalesOrderTypesController],
  providers: [SalesOrderTypesService],
  exports: [SalesOrderTypesService],
})
export class SalesOrderTypesModule {}

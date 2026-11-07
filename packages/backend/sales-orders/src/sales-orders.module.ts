import { DatabaseModule } from '@dafne/backend-database';
import { Module } from '@nestjs/common';
import { SalesOrdersService } from './sales-orders.service.js';
import { SalesOrdersController } from './sales-orders.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}

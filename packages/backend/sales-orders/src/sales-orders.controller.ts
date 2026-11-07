import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  salesOrderBodySchema,
  listSalesOrdersQuerySchema,
  type SalesOrderBody,
  type SalesOrderDetail,
  type SalesOrdersList,
  type ListSalesOrdersQuery,
} from '@dafne/contracts';
import { SalesOrdersService } from './sales-orders.service.js';

/** Sales orders, for any signed-in user (the global auth guard checks it). */
@Controller('sales-orders')
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  listSalesOrders(
    @Query(new ZodValidationPipe(listSalesOrdersQuerySchema))
    query: ListSalesOrdersQuery,
  ): Promise<SalesOrdersList> {
    return this.salesOrdersService.listSalesOrders(query);
  }

  @Get(':id')
  getSalesOrder(@Param('id', IdPipe) id: number): Promise<SalesOrderDetail> {
    return this.salesOrdersService.getSalesOrder(id);
  }

  @Post()
  createSalesOrder(
    @Body(new ZodValidationPipe(salesOrderBodySchema)) body: SalesOrderBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderDetail> {
    return this.salesOrdersService.createSalesOrder(body, session.user.id);
  }

  @Put(':id')
  updateSalesOrder(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(salesOrderBodySchema)) body: SalesOrderBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderDetail> {
    return this.salesOrdersService.updateSalesOrder(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSalesOrder(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.salesOrdersService.deleteSalesOrder(id, session.user.id);
  }
}

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
  listChangesQuerySchema,
  type ChangesList,
  type ListChangesQuery,
  salesOrderBodySchema,
  salesOrderStatusBodySchema,
  type SalesOrderStatusBody,
  listSalesOrdersQuerySchema,
  type SalesOrderBody,
  type SalesOrderDetail,
  type SalesOrderDetailItem,
  type SalesOrdersList,
  type ListSalesOrdersQuery,
} from '@dafne/contracts';
import { ChangelogService } from '@dafne/backend-changelog';
import { SalesOrdersService } from './sales-orders.service.js';
import { SALES_ORDERS_RESOURCE } from './sales-order.changelog.js';
import type { CrudController } from '@dafne/backend-crud';

/** Sales orders, for any signed-in user (the global auth guard checks it). */
@Controller('sales-orders')
export class SalesOrdersController
  implements
    CrudController<
      number,
      ListSalesOrdersQuery,
      SalesOrdersList,
      SalesOrderBody,
      SalesOrderDetail
    >
{
  constructor(
    private readonly salesOrdersService: SalesOrdersService,
    private readonly changelog: ChangelogService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listSalesOrdersQuerySchema))
    query: ListSalesOrdersQuery,
  ): Promise<SalesOrdersList> {
    return this.salesOrdersService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<SalesOrderDetail> {
    return this.salesOrdersService.get(id);
  }

  /** The changes of a sales order, newest first. 404 if it doesn't exist or is deleted. */
  @Get(':id/changes')
  async changes(
    @Param('id', IdPipe) id: number,
    @Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.salesOrdersService.get(id);
    return this.changelog.list(SALES_ORDERS_RESOURCE, id, query);
  }

  @Get(':id/items/:position')
  getSalesOrderItem(
    @Param('id', IdPipe) id: number,
    @Param('position', IdPipe) position: number,
  ): Promise<SalesOrderDetailItem> {
    return this.salesOrdersService.getSalesOrderItem(id, position);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(salesOrderBodySchema)) body: SalesOrderBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderDetail> {
    return this.salesOrdersService.create(body, session.user);
  }

  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(salesOrderBodySchema)) body: SalesOrderBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderDetail> {
    return this.salesOrdersService.update(id, body, session.user);
  }

  /** Moves the sales order to another status (see SALES_ORDER_STATES). */
  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  changeSalesOrderStatus(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(salesOrderStatusBodySchema)) body: SalesOrderStatusBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderDetail> {
    return this.salesOrdersService.changeSalesOrderStatus(id, body.status, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.salesOrdersService.delete(id, session.user);
  }
}

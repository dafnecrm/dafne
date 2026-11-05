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
  orderBodySchema,
  listOrdersQuerySchema,
  type OrderBody,
  type OrderDetail,
  type OrdersList,
  type ListOrdersQuery,
} from '@dafne/contracts';
import { OrdersService } from './orders.service.js';

/** Orders, for any signed-in user (the global auth guard checks it). */
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  listOrders(
    @Query(new ZodValidationPipe(listOrdersQuerySchema))
    query: ListOrdersQuery,
  ): Promise<OrdersList> {
    return this.ordersService.listOrders(query);
  }

  @Get(':id')
  getOrder(@Param('id', IdPipe) id: number): Promise<OrderDetail> {
    return this.ordersService.getOrder(id);
  }

  @Post()
  createOrder(
    @Body(new ZodValidationPipe(orderBodySchema)) body: OrderBody,
    @Session() session: UserSession,
  ): Promise<OrderDetail> {
    return this.ordersService.createOrder(body, session.user.id);
  }

  @Put(':id')
  updateOrder(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(orderBodySchema)) body: OrderBody,
    @Session() session: UserSession,
  ): Promise<OrderDetail> {
    return this.ordersService.updateOrder(id, body, session.user.id);
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrder(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.ordersService.deleteOrder(id, session.user.id);
  }
}

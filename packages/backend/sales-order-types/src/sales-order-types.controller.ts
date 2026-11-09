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
import { TextIdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  salesOrderTypeBodySchema,
  listSalesOrderTypesQuerySchema,
  type SalesOrderTypeBody,
  type SalesOrderTypeDetail,
  type SalesOrderTypesList,
  type ListSalesOrderTypesQuery,
} from '@dafne/contracts';
import { SalesOrderTypesService } from './sales-order-types.service.js';

/** Sales order types, for any signed-in user (the global auth guard checks it). */
@Controller('sales-order-types')
export class SalesOrderTypesController {
  constructor(
    private readonly salesOrderTypesService: SalesOrderTypesService,
  ) {}

  @Get()
  listSalesOrderTypes(
    @Query(new ZodValidationPipe(listSalesOrderTypesQuerySchema))
    query: ListSalesOrderTypesQuery,
  ): Promise<SalesOrderTypesList> {
    return this.salesOrderTypesService.listSalesOrderTypes(query);
  }

  @Get(':id')
  getSalesOrderType(
    @Param('id', new TextIdPipe(5)) id: string,
  ): Promise<SalesOrderTypeDetail> {
    return this.salesOrderTypesService.getSalesOrderType(id);
  }

  @Post()
  createSalesOrderType(
    @Body(new ZodValidationPipe(salesOrderTypeBodySchema))
    body: SalesOrderTypeBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderTypeDetail> {
    return this.salesOrderTypesService.createSalesOrderType(
      body,
      session.user.id,
    );
  }

  @Put(':id')
  updateSalesOrderType(
    @Param('id', new TextIdPipe(5)) id: string,
    @Body(new ZodValidationPipe(salesOrderTypeBodySchema))
    body: SalesOrderTypeBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderTypeDetail> {
    return this.salesOrderTypesService.updateSalesOrderType(
      id,
      body,
      session.user.id,
    );
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSalesOrderType(
    @Param('id', new TextIdPipe(5)) id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.salesOrderTypesService.deleteSalesOrderType(id, session.user.id);
  }
}

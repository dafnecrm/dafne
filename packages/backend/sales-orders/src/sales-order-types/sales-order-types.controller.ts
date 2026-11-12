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
import type { CrudController } from '@dafne/backend-crud';

/** Sales order types, for any signed-in user (the global auth guard checks it). */
@Controller('sales-order-types')
export class SalesOrderTypesController
  implements
    CrudController<
      string,
      ListSalesOrderTypesQuery,
      SalesOrderTypesList,
      SalesOrderTypeBody,
      SalesOrderTypeDetail
    >
{
  constructor(
    private readonly salesOrderTypesService: SalesOrderTypesService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listSalesOrderTypesQuerySchema))
    query: ListSalesOrderTypesQuery,
  ): Promise<SalesOrderTypesList> {
    return this.salesOrderTypesService.list(query);
  }

  @Get(':id')
  get(
    @Param('id', new TextIdPipe(5)) id: string,
  ): Promise<SalesOrderTypeDetail> {
    return this.salesOrderTypesService.get(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(salesOrderTypeBodySchema))
    body: SalesOrderTypeBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderTypeDetail> {
    return this.salesOrderTypesService.create(
      body,
      session.user,
    );
  }

  @Put(':id')
  update(
    @Param('id', new TextIdPipe(5)) id: string,
    @Body(new ZodValidationPipe(salesOrderTypeBodySchema))
    body: SalesOrderTypeBody,
    @Session() session: UserSession,
  ): Promise<SalesOrderTypeDetail> {
    return this.salesOrderTypesService.update(
      id,
      body,
      session.user,
    );
  }

  /** Logical delete. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', new TextIdPipe(5)) id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.salesOrderTypesService.delete(id, session.user);
  }
}

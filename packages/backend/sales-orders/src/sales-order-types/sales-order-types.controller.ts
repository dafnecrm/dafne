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
  listChangesQuerySchema,
  type ListChangesQuery,
  type ChangesList,
  type SalesOrderTypeBody,
  type SalesOrderTypeDetail,
  type SalesOrderTypesList,
  type ListSalesOrderTypesQuery,
} from '@dafne/contracts';
import { SalesOrderTypesService } from './sales-order-types.service.js';
import type { CrudController } from '@dafne/backend-crud';
import { ChangelogService } from '@dafne/backend-changelog';
import { SALES_ORDER_TYPES_RESOURCE } from './sales-order-type.changelog.js';

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
    private readonly changelog: ChangelogService,
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

  /** The changes of a sales order type, newest first. 404 if it doesn't exist or is deleted. */
  @Get(':id/changes')
  async changes(
    @Param('id', new TextIdPipe(5)) id: string,
    @Query(new ZodValidationPipe(listChangesQuerySchema)) query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.salesOrderTypesService.get(id);
    return this.changelog.list(SALES_ORDER_TYPES_RESOURCE, id, query);
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

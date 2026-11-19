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
import { Can } from '@dafne/backend-user-groups';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  uomConversionBodySchema,
  listUomConversionsQuerySchema,
  type UomConversionBody,
  type UomConversionDetail,
  type UomConversionsList,
  type ListUomConversionsQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { UomConversionsService } from './uom-conversions.service.js';

/**
 * Conversions between units, read by any signed-in user (the global auth
 * guard checks it); writes need the UomConversion permissions.
 */
@Controller('uom-conversions')
export class UomConversionsController implements CrudController<
  number,
  ListUomConversionsQuery,
  UomConversionsList,
  UomConversionBody,
  UomConversionDetail
> {
  constructor(private readonly uomConversionsService: UomConversionsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listUomConversionsQuerySchema))
    query: ListUomConversionsQuery,
  ): Promise<UomConversionsList> {
    return this.uomConversionsService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<UomConversionDetail> {
    return this.uomConversionsService.get(id);
  }

  @Can('create', 'UomConversion')
  @Post()
  create(
    @Body(new ZodValidationPipe(uomConversionBodySchema))
    body: UomConversionBody,
    @Session() session: UserSession,
  ): Promise<UomConversionDetail> {
    return this.uomConversionsService.create(body, session.user);
  }

  @Can('update', 'UomConversion')
  @Put(':id')
  update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(uomConversionBodySchema))
    body: UomConversionBody,
    @Session() session: UserSession,
  ): Promise<UomConversionDetail> {
    return this.uomConversionsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Can('delete', 'UomConversion')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.uomConversionsService.delete(id, session.user);
  }
}

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
import { Can } from '@dafne/backend-permissions';
import { Session } from '@dafne/backend-session';
import type { UserSession } from '@dafne/backend-session';
import { TextIdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  uomBodySchema,
  listUomsQuerySchema,
  type UomBody,
  type UomDetail,
  type UomsList,
  type ListUomsQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { UomsService } from './uoms.service.js';

/**
 * Units of measure, read by any signed-in user (the global auth guard checks
 * it); writes need the Uom permissions.
 */
@Controller('uoms')
export class UomsController implements CrudController<
  string,
  ListUomsQuery,
  UomsList,
  UomBody,
  UomDetail
> {
  constructor(private readonly uomsService: UomsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listUomsQuerySchema))
    query: ListUomsQuery,
  ): Promise<UomsList> {
    return this.uomsService.list(query);
  }

  @Get(':id')
  get(@Param('id', new TextIdPipe(10)) id: string): Promise<UomDetail> {
    return this.uomsService.get(id);
  }

  @Can('create', 'Uom')
  @Post()
  create(
    @Body(new ZodValidationPipe(uomBodySchema)) body: UomBody,
    @Session() session: UserSession,
  ): Promise<UomDetail> {
    return this.uomsService.create(body, session.user);
  }

  @Can('update', 'Uom')
  @Put(':id')
  update(
    @Param('id', new TextIdPipe(10)) id: string,
    @Body(new ZodValidationPipe(uomBodySchema)) body: UomBody,
    @Session() session: UserSession,
  ): Promise<UomDetail> {
    return this.uomsService.update(id, body, session.user);
  }

  /** Logical delete. */
  @Can('delete', 'Uom')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', new TextIdPipe(10)) id: string,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.uomsService.delete(id, session.user);
  }
}

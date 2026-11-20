import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Can, PermissionsService } from '@dafne/backend-permissions';
import { Session } from '@dafne/backend-session';
import type { SessionUser, UserSession } from '@dafne/backend-session';
import { IdPipe, ZodValidationPipe } from '@dafne/backend-common';
import {
  msg,
  quotationBodySchema,
  quotationStatusBodySchema,
  listQuotationsQuerySchema,
  listChangesQuerySchema,
  updateQuotationQuerySchema,
  type ListChangesQuery,
  type ChangesList,
  type QuotationBody,
  type QuotationDetail,
  type QuotationDetailItem,
  type QuotationStatusBody,
  type QuotationsList,
  type ListQuotationsQuery,
  type UpdateQuotationQuery,
} from '@dafne/contracts';
import type { CrudController } from '@dafne/backend-crud';
import { ChangelogService } from '@dafne/backend-changelog';
import { QuotationsService } from './quotations.service.js';
import { QUOTATIONS_RESOURCE } from './quotation.changelog.js';

/** Quotations, for any signed-in user (the global auth guard checks it). */
@Controller('quotations')
export class QuotationsController
  implements CrudController<number, ListQuotationsQuery, QuotationsList, QuotationBody, QuotationDetail>
{
  constructor(
    private readonly quotationsService: QuotationsService,
    private readonly changelog: ChangelogService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(listQuotationsQuerySchema))
    query: ListQuotationsQuery,
  ): Promise<QuotationsList> {
    return this.quotationsService.list(query);
  }

  @Get(':id')
  get(@Param('id', IdPipe) id: number): Promise<QuotationDetail> {
    return this.quotationsService.get(id);
  }

  /** The changes of a quotation, newest first. 404 if it doesn't exist or is deleted. */
  @Get(':id/changes')
  async changes(
    @Param('id', IdPipe) id: number,
    @Query(new ZodValidationPipe(listChangesQuerySchema))
    query: ListChangesQuery,
  ): Promise<ChangesList> {
    await this.quotationsService.get(id);
    return this.changelog.list(QUOTATIONS_RESOURCE, id, query);
  }

  @Get(':id/items/:position')
  getQuotationItem(
    @Param('id', IdPipe) id: number,
    @Param('position', IdPipe) position: number,
  ): Promise<QuotationDetailItem> {
    return this.quotationsService.getQuotationItem(id, position);
  }

  @Post()
  @Can('create', 'Quotation')
  async create(
    @Body(new ZodValidationPipe(quotationBodySchema)) body: QuotationBody,
    @Session() session: UserSession,
  ): Promise<QuotationDetail> {
    // Born in draft: another status is a status change.
    if (body.status && body.status !== 'draft') {
      await this.requireChangeStatus(session.user);
    }
    return this.quotationsService.create(body, session.user);
  }

  @Put(':id')
  @Can('update', 'Quotation')
  async update(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(quotationBodySchema)) body: QuotationBody,
    @Session() session: UserSession,
    // ?reprice=true: every item gets its product's price of today.
    @Query(new ZodValidationPipe(updateQuotationQuerySchema)) query?: UpdateQuotationQuery,
  ): Promise<QuotationDetail> {
    // The form sends the status too: changing it needs changeStatus.
    if (body.status && body.status !== (await this.quotationsService.get(id)).status) {
      await this.requireChangeStatus(session.user);
    }
    return this.quotationsService.update(id, body, session.user, { reprice: query?.reprice ?? false });
  }

  /** 403 unless the user may change quotations' status (POST :id/status's permission). */
  private async requireChangeStatus(user: SessionUser) {
    if (!(await this.permissions.abilityFor(user)).can('changeStatus', 'Quotation')) {
      throw new ForbiddenException(msg('permissions.forbidden'));
    }
  }

  /**
   * Moves the quotation to another status (see QUOTATION_STATES): `accepted`
   * also creates its sales order (`salesOrder` in the response).
   */
  @Post(':id/status')
  @Can('changeStatus', 'Quotation')
  @HttpCode(HttpStatus.OK)
  changeQuotationStatus(
    @Param('id', IdPipe) id: number,
    @Body(new ZodValidationPipe(quotationStatusBodySchema)) body: QuotationStatusBody,
    @Session() session: UserSession,
  ): Promise<QuotationDetail> {
    return this.quotationsService.changeQuotationStatus(id, body.status, session.user);
  }

  /** Logical delete. */
  @Delete(':id')
  @Can('delete', 'Quotation')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', IdPipe) id: number,
    @Session() session: UserSession,
  ): Promise<void> {
    await this.quotationsService.delete(id, session.user);
  }
}

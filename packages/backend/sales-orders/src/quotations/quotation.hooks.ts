import type { TransitionContext, TransitionHook, TransitionHookResult } from '@dafne/backend-fsm';
import { msg, type QuotationBody, type QuotationDetail, type QuotationStatus } from '@dafne/contracts';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { draftOnlyHook } from '../items/document-hooks.js';
import { SalesOrdersService } from '../sales-orders.service.js';
import { QUOTATION_CHANGELOG } from './quotation.changelog.js';
import { EmailsService } from '@dafne/backend-notifications';
import { DocumentsService } from '@dafne/backend-documents';
import { QUOTATION_DOCUMENT } from './quotation.document.js';

/**
 * Pre hook of update: a quotation that isn't a draft may change only its
 * notes (what was sent stays as it was). The status isn't compared: the
 * state machine checks its changes.
 */
export const QuotationIsDraftHook = draftOnlyHook<QuotationBody, QuotationDetail>(
  QUOTATION_CHANGELOG,
  msg('quotations.status.mustBeDraft'),
);

/**
 * Post hook of sent → accepted: creates the quotation's sales order, in the
 * transition's transaction (a failure rolls the acceptance back). The order
 * starts in draft, with the quotation's customer, type, notes and items, at
 * the quotation's prices. `sales_order.quotation_id` is unique: one order
 * per quotation.
 */
@Injectable()
export class CreateSalesOrderFromQuotation implements TransitionHook<QuotationStatus, number> {
  // Not QuotationsService: it needs this machine, which needs its hooks.
  constructor(private readonly salesOrders: SalesOrdersService) { }

  async run({ id, tx, user }: TransitionContext<QuotationStatus, number>): Promise<void> {
    // The order's creator: accepting a quotation is a user's act.
    if (!user) {
      throw new Error(`Quotation ${id}: accepting it needs a user, the sales order's creator.`);
    }
    const quotation = await tx.query.quotation.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { customerId: true, typeId: true, notes: true },
      with: { items: { columns: { position: true, productId: true, quantity: true, uomId: true, price: true } } },
    });
    if (!quotation) {
      throw new NotFoundException(msg('quotations.notFound'));
    }
    const items = quotation.items.map(({ position, productId, quantity, uomId }) => ({
      position,
      productId,
      quantity,
      uomId,
    }));
    await this.salesOrders.create(
      { customerId: quotation.customerId, typeId: quotation.typeId, notes: quotation.notes, items },
      user,
      {
        tx,
        quotationId: id,
        prices: quotation.items,
      },
    );
  }
}

/** Send quotation pdf to customer */
@Injectable()
export class SendQuotationPdfToCustomer implements TransitionHook<QuotationStatus, number> {
  logger = new Logger(SendQuotationPdfToCustomer.name);

  constructor(
    private emailsService: EmailsService,
    private documentsService: DocumentsService,
  ) { }

  async run({ id, tx, user }: TransitionContext<QuotationStatus, number>): Promise<TransitionHookResult> {
    if (!user) {
      throw new Error(`Quotation ${id}: accepting it needs a user.`);
    }

    const quotation = await tx.query.quotation.findFirst({
      where: { id, deletedAt: { isNull: true } },
      columns: { id: true },
      with: { customer: { columns: { email: true, name: true } } },
    });

    if (!quotation) {
      throw new NotFoundException(msg('quotations.notFound'));
    }

    try {
      /** render the default template */
      const { pdf, fileName } = await this.documentsService.render(QUOTATION_DOCUMENT, String(quotation.id), {
        actor: user,
        locale: 'en'
      })

      this.logger.log(`Sending quotation pdf to ${quotation.customer.email}`);
      try {
        await this.emailsService.sendEmailWithTemplate(quotation.customer.email, 'quotation', {
          quotationId: String(quotation.id),
          customerName: quotation.customer.name,
        }, [{
          filename: fileName,
          content: pdf
        }])
      } catch (error) {
        throw new ConflictException(msg('notifications.emailNotSent'));
      }
    } catch (error) {
      throw new ConflictException(msg('documentTemplates.notFound'));
    }
  }
}

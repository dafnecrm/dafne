import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomersService } from '@dafne/backend-customers';
import {
  DocumentSourceFor,
  type DocumentContext,
  type DocumentData,
  type DocumentSource,
} from '@dafne/backend-documents';
import { msg, type CustomerAddress, type CustomerDetail, type QuotationDetail } from '@dafne/contracts';
import { QuotationsService } from './quotations.service.js';

/** The `resource` of the quotations' templates: GET /documents/quotation/:id/pdf. */
export const QUOTATION_DOCUMENT = 'quotation';

/** An address as templates read it. */
export interface QuotationDocumentAddress {
  street: string;
  postalCode: string | null;
  city: string;
  region: string | null;
  countryCode: string;
}

/**
 * What a quotation's templates can use, e.g. `{customer.name}`,
 * `{validUntil | date}`, `{total | currency}`, and the items' table row
 * `{#items}{position} {product} {quantity | number:2} {uom} {unitPrice | currency} {price | currency}{/items}`.
 * Values are raw (numbers, dates): the template's filters format them.
 */
export interface QuotationDocumentData {
  id: number;
  status: string;
  type: { id: string; description: string };
  createdAt: Date;
  validUntil: Date | null;
  notes: string | null;
  createdBy: string | null;
  customer: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    fiscalCode: string | null;
    vatNumber: string | null;
    /** The billing address, else the head office, else the first one. */
    address: QuotationDocumentAddress | null;
  };
  items: {
    position: number;
    product: string;
    quantity: number;
    uom: string;
    /** The price of one unit of `uom`. */
    unitPrice: number;
    price: number;
  }[];
  /** The sum of the items' prices. */
  total: number;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The address a document shows for a customer. */
function documentAddress(addresses: CustomerAddress[]): QuotationDocumentAddress | null {
  const found =
    addresses.find((address) => address.type === 'billing') ??
    addresses.find((address) => address.type === 'head_office') ??
    addresses[0];
  if (!found) {
    return null;
  }
  const { street, postalCode, city, region, countryCode } = found;
  return { street, postalCode, city, region, countryCode };
}

/** A quotation and its customer as its templates read them. */
export function quotationDocumentData(quotation: QuotationDetail, customer: CustomerDetail): QuotationDocumentData {
  const items = quotation.items.map((item) => ({
    position: item.position,
    product: item.product.name,
    quantity: item.quantity,
    uom: item.uom.name,
    unitPrice: item.quantity ? round2(item.price / item.quantity) : 0,
    price: item.price,
  }));
  return {
    id: quotation.id,
    status: quotation.status,
    type: { id: quotation.type.id, description: quotation.type.description },
    createdAt: quotation.createdAt,
    validUntil: quotation.validUntil,
    notes: quotation.notes,
    createdBy: quotation.createdBy?.name ?? null,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      fiscalCode: customer.fiscalCode,
      vatNumber: customer.vatNumber,
      address: documentAddress(customer.addresses),
    },
    items,
    total: round2(items.reduce((sum, item) => sum + item.price, 0)),
  };
}

/** The quotations' documents: GET /documents/quotation/:id/pdf. */
@Injectable()
@DocumentSourceFor(QUOTATION_DOCUMENT)
export class QuotationDocumentSource implements DocumentSource<QuotationDocumentData> {
  constructor(
    private readonly quotations: QuotationsService,
    private readonly customers: CustomersService,
  ) {}

  /** Every user of the app can read quotations: only a missing one is refused (404). */
  async load(id: string, _context: DocumentContext): Promise<DocumentData<QuotationDocumentData>> {
    if (!/^\d{1,9}$/.test(id)) {
      throw new NotFoundException(msg('quotations.notFound'));
    }
    const quotation = await this.quotations.get(Number(id));
    const customer = await this.customers.get(quotation.customerId);
    return {
      data: quotationDocumentData(quotation, customer),
      fileName: `quotation-${quotation.id}`,
      // Its template and formats follow the customer's language.
      language: customer.language,
    };
  }

  sample(_locale: string): QuotationDocumentData {
    return {
      id: 1001,
      status: 'draft',
      type: { id: 'STD', description: 'Standard' },
      createdAt: new Date('2026-01-15T09:30:00Z'),
      validUntil: new Date('2026-02-15T00:00:00Z'),
      notes: 'Delivery within 30 days.',
      createdBy: 'Mario Rossi',
      customer: {
        id: 1,
        name: 'Acme S.r.l.',
        email: 'info@acme.example',
        phone: '+39 02 1234567',
        fiscalCode: '01234567890',
        vatNumber: 'IT01234567890',
        address: { street: 'Via Roma 1', postalCode: '20121', city: 'Milano', region: 'MI', countryCode: 'IT' },
      },
      items: [
        { position: 1, product: 'Widget', quantity: 10, uom: 'Piece', unitPrice: 12.5, price: 125 },
        { position: 2, product: 'Gadget', quantity: 2.5, uom: 'Kilogram', unitPrice: 40, price: 100 },
      ],
      total: 225,
    };
  }
}

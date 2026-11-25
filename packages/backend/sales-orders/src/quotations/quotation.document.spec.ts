import { NotFoundException } from '@nestjs/common';
import type { CustomersService } from '@dafne/backend-customers';
import type { SessionUser } from '@dafne/backend-session';
import type { CustomerDetail, QuotationDetail } from '@dafne/contracts';
import { QuotationDocumentSource, quotationDocumentData } from './quotation.document.js';
import type { QuotationsService } from './quotations.service.js';

const quotation = {
  id: 42,
  status: 'sent',
  customerId: 7,
  typeId: 'STD',
  customer: { id: 7, name: 'Acme' },
  type: { id: 'STD', description: 'Standard' },
  validUntil: new Date('2026-12-31'),
  createdAt: new Date('2026-11-20T10:00:00Z'),
  updatedAt: new Date('2026-11-20T10:00:00Z'),
  createdBy: { id: 'u1', name: 'Mario Rossi' },
  updatedBy: null,
  notes: 'Fragile',
  salesOrder: null,
  deletedAt: null,
  items: [
    {
      position: 1,
      productId: 1,
      product: { id: 1, name: 'Widget', uom: { id: 'PCE', name: 'Piece' }, price: 12.5 },
      quantity: 3,
      uomId: 'PCE',
      uom: { id: 'PCE', name: 'Piece' },
      baseQuantity: 3,
      price: 37.5,
    },
    {
      position: 2,
      productId: 2,
      product: { id: 2, name: 'Gadget', uom: { id: 'KGM', name: 'Kilogram' }, price: 10 },
      quantity: 0.333,
      uomId: 'KGM',
      uom: { id: 'KGM', name: 'Kilogram' },
      baseQuantity: 0.333,
      price: 3.33,
    },
  ],
} as QuotationDetail;

const address = (type: string, city: string) => ({
  id: 1,
  type,
  street: 'Via Roma 1',
  city,
  postalCode: '20121',
  region: 'MI',
  countryCode: 'IT',
});

const customer = {
  id: 7,
  type: 'company',
  name: 'Acme S.r.l.',
  email: 'info@acme.example',
  phone: null,
  fiscalCode: null,
  vatNumber: 'IT01234567890',
  language: 'en',
  addresses: [address('shipping', 'Torino'), address('billing', 'Milano')],
} as unknown as CustomerDetail;

describe('quotationDocumentData', () => {
  it('gives the quotation, its customer with the billing address, the items and the total', () => {
    const data = quotationDocumentData(quotation, customer);

    expect(data).toMatchObject({
      id: 42,
      status: 'sent',
      notes: 'Fragile',
      createdBy: 'Mario Rossi',
      customer: { name: 'Acme S.r.l.', vatNumber: 'IT01234567890', address: { city: 'Milano' } },
      items: [
        { position: 1, product: 'Widget', quantity: 3, uom: 'Piece', unitPrice: 12.5, price: 37.5 },
        { position: 2, product: 'Gadget', uom: 'Kilogram', unitPrice: 10, price: 3.33 },
      ],
      total: 40.83,
    });
  });

  it('falls back to another address, or none', () => {
    const shipping = { ...customer, addresses: [address('shipping', 'Torino')] } as CustomerDetail;
    expect(quotationDocumentData(quotation, shipping).customer.address?.city).toBe('Torino');

    const none = { ...customer, addresses: [] } as unknown as CustomerDetail;
    expect(quotationDocumentData(quotation, none).customer.address).toBeNull();
  });
});

describe('QuotationDocumentSource', () => {
  const quotations = { get: vi.fn() };
  const customers = { get: vi.fn() };
  const source = new QuotationDocumentSource(
    quotations as unknown as QuotationsService,
    customers as unknown as CustomersService,
  );
  const context = { actor: { id: 'u1' } as SessionUser, locale: 'it' };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads the quotation and its customer, in the customer language', async () => {
    quotations.get.mockResolvedValue(quotation);
    customers.get.mockResolvedValue(customer);

    const { data, fileName, language } = await source.load('42', context);

    expect(quotations.get).toHaveBeenCalledWith(42);
    expect(customers.get).toHaveBeenCalledWith(7);
    expect(data.total).toBe(40.83);
    expect(fileName).toBe('quotation-42');
    expect(language).toBe('en');
  });

  it('answers 404 for an id that is not a number', async () => {
    await expect(source.load('abc', context)).rejects.toBeInstanceOf(NotFoundException);
    expect(quotations.get).not.toHaveBeenCalled();
  });

  it('has sample data with every field and at least one item', () => {
    const sample = source.sample('it');
    const real = quotationDocumentData(quotation, customer);

    expect(Object.keys(sample).sort()).toEqual(Object.keys(real).sort());
    expect(Object.keys(sample.customer).sort()).toEqual(Object.keys(real.customer).sort());
    expect(Object.keys(sample.items[0]).sort()).toEqual(Object.keys(real.items[0]).sort());
  });
});

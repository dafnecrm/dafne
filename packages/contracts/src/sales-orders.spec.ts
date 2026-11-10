import { salesOrderBodySchema, listSalesOrdersQuerySchema, salesOrderStatusBodySchema } from './sales-orders.ts';

/** Paths of the fields that failed, e.g. ['name']. */
function failedFields(body: unknown) {
  const result = salesOrderBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('salesOrderBodySchema', () => {
  it('trims values', () => {
    expect(salesOrderBodySchema.parse({ customerId: '1', typeId: 'T1' })).toEqual({
      customerId: 1,
      notes: null,
      items: [],
      typeId: 'T1',
    });
  });

  it('rejects two items with the same position', () => {
    const item = (position: number | null) => ({ position, productId: 1, quantity: 2 });
    expect(salesOrderBodySchema.safeParse({ customerId: 1, items: [item(1), item(2)], typeId: 'T1' }).success).toBe(true);
    expect(failedFields({ customerId: 1, items: [item(1), item(1)], typeId: 'T1' })).toEqual(['items']);
    expect(failedFields({ customerId: 1, items: [item(null)], typeId: 'T1' })).toEqual(['items.0.position']);
  });

  it('takes the customer id as a number or as text, and nothing else', () => {
    expect(salesOrderBodySchema.parse({ customerId: 7, typeId: 'T1' }).customerId).toBe(7);
    for (const customerId of ['', 'abc', '1.5', '0', -1]) {
      expect(failedFields({ customerId, typeId: 'T1' })).toEqual(['customerId']);
    }
  });
  it('rejects unknown properties such as deletedAt', () => {
    expect(
      failedFields({
        deletedAt: '2026-01-01',
        customerId: '1',
        typeId: 'T1',
      }),
    ).toEqual(['unrecognized_keys']);
  });
});

describe('listSalesOrdersQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(listSalesOrdersQuerySchema.parse({ limit: '10', offset: '20' })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listSalesOrdersQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});

describe('salesOrderStatusBodySchema', () => {
  it('takes a known status, and nothing else', () => {
    expect(salesOrderStatusBodySchema.parse({ status: 'open' })).toEqual({ status: 'open' });
    for (const body of [{}, { status: 'confirmed' }, { status: 'open', notes: 'x' }]) {
      expect(salesOrderStatusBodySchema.safeParse(body).success).toBe(false);
    }
  });
});

import { salesOrderBodySchema, listSalesOrdersQuerySchema } from './sales-orders.ts';

/** Paths of the fields that failed, e.g. ['name']. */
function failedFields(body: unknown) {
  const result = salesOrderBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('salesOrderBodySchema', () => {
  it('trims values', () => {
    expect(salesOrderBodySchema.parse({ customerId: '1', type: 'Type' })).toEqual({
      customerId: 1,
      notes: null,
      type: 'Type',
      items: [],
    });
  });

  it('rejects two items with the same position', () => {
    const item = (position: number | null) => ({ position, productId: 1, quantity: 2 });
    expect(salesOrderBodySchema.safeParse({ customerId: 1, type: 'T', items: [item(1), item(2)] }).success).toBe(true);
    expect(failedFields({ customerId: 1, type: 'T', items: [item(1), item(1)] })).toEqual(['items']);
    expect(failedFields({ customerId: 1, type: 'T', items: [item(null)] })).toEqual(['items.0.position']);
  });

  it('takes the customer id as a number or as text, and nothing else', () => {
    expect(salesOrderBodySchema.parse({ customerId: 7, type: 'Type' }).customerId).toBe(7);
    for (const customerId of ['', 'abc', '1.5', '0', -1])
      expect(failedFields({ customerId, type: 'Type' })).toEqual(['customerId']);
  });
  it('rejects unknown properties such as deletedAt', () => {
    expect(
      failedFields({
        deletedAt: '2026-01-01',
        customerId: '1',
        type: 'Type',
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

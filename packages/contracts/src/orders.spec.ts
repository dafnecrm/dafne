import { orderBodySchema, listOrdersQuerySchema } from './orders.ts';

/** Paths of the fields that failed, e.g. ['name']. */
function failedFields(body: unknown) {
  const result = orderBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('orderBodySchema', () => {
  it('trims values', () => {
    expect(orderBodySchema.parse({ customerId: '1' })).toEqual({
      customerId: 1,
      notes: null,
    });
  });

  it('takes the customer id as a number or as text, and nothing else', () => {
    expect(orderBodySchema.parse({ customerId: 7 }).customerId).toBe(7);
    for (const customerId of ['', 'abc', '1.5', '0', -1])
      expect(failedFields({ customerId })).toEqual(['customerId']);
  });
  it('rejects unknown properties such as deletedAt', () => {
    expect(
      failedFields({
        deletedAt: '2026-01-01',
        customerId: '1',
      }),
    ).toEqual(['unrecognized_keys']);
  });
});

describe('listOrdersQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(listOrdersQuerySchema.parse({ limit: '10', offset: '20' })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listOrdersQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});

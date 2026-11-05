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
    expect(
      orderBodySchema.parse({ name: '  Acme  ', customerId: 'Customer id' }),
    ).toEqual({
      name: 'Acme',
      customerId: 'Customer id',
      notes: null,
    });
  });

  it('rejects a blank name', () => {
    expect(failedFields({ name: '   ', customerId: 'Customer id' })).toEqual([
      'name',
    ]);
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(
      failedFields({
        name: 'Acme',
        deletedAt: '2026-01-01',
        customerId: 'Customer id',
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

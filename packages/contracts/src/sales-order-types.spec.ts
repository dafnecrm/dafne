import {
  salesOrderTypeBodySchema,
  listSalesOrderTypesQuerySchema,
} from './sales-order-types.ts';

/** Paths of the fields that failed, e.g. ['email']. */
function failedFields(body: unknown) {
  const result = salesOrderTypeBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('salesOrderTypeBodySchema', () => {
  it('parses a body', () => {
    expect(salesOrderTypeBodySchema.parse({description: 'Description', id: 'Id'})).toEqual({description: 'Description', id: 'Id'});
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(failedFields({ deletedAt: '2026-01-01', description: 'Description', id: 'Id' })).toEqual([
      'unrecognized_keys',
    ]);
  });
});

describe('listSalesOrderTypesQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(
      listSalesOrderTypesQuerySchema.parse({ limit: '10', offset: '20' }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listSalesOrderTypesQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});

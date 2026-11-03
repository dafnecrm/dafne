import { productBodySchema, listProductsQuerySchema } from './products.ts';

/** Paths of the fields that failed, e.g. ['name']. */
function failedFields(body: unknown) {
  const result = productBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('productBodySchema', () => {
  it('trims values', () => {
    expect(
      productBodySchema.parse({ name: '  Acme  ', price: '1.00' }),
    ).toEqual({
      name: 'Acme',
      price: '1.00',
    });
  });

  it('rejects a blank name', () => {
    expect(failedFields({ name: '   ', price: '1.00' })).toEqual(['name']);
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(
      failedFields({ name: 'Acme', deletedAt: '2026-01-01', price: '1.00' }),
    ).toEqual(['unrecognized_keys']);
  });
});

describe('listProductsQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(
      listProductsQuerySchema.parse({ limit: '10', offset: '20' }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listProductsQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});

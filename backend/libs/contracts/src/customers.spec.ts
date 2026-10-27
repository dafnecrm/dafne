import { customerBodySchema, listCustomersQuerySchema } from './customers.ts';

/** Paths of the fields that failed, e.g. ['name', 'addresses.0.city']. */
function failedFields(body: unknown) {
  const result = customerBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

describe('customerBodySchema', () => {
  it('trims values and turns blank optional fields into null', () => {
    const body = customerBodySchema.parse({
      name: '  Acme  ',
      email: ' ',
      phone: '',
      addresses: [
        {
          street: ' Via Roma 1 ',
          city: 'Milano',
          country: 'Italy',
          region: '',
        },
      ],
    });

    expect(body).toMatchObject({ name: 'Acme', email: null, phone: null });
    expect(body.addresses[0]).toMatchObject({
      street: 'Via Roma 1',
      region: null,
      label: null,
    });
  });

  it('turns missing optional fields into null and addresses into []', () => {
    expect(customerBodySchema.parse({ name: 'Acme' })).toEqual({
      name: 'Acme',
      email: null,
      phone: null,
      addresses: [],
    });
  });

  it('rejects a blank name, a bad email and a bad phone', () => {
    expect(
      failedFields({ name: '   ', email: 'not-an-email', phone: 'call me' }),
    ).toEqual(['name', 'email', 'phone']);
  });

  it('accepts common phone formats', () => {
    for (const phone of ['+39 02 1234 5678', '(555) 123-4567', '02.123.456']) {
      expect(failedFields({ name: 'A', phone })).toEqual([]);
    }
  });

  it('validates each address', () => {
    expect(
      failedFields({
        name: 'Acme',
        addresses: [{ street: 'Via Roma 1', city: '', country: 'Italy' }],
      }),
    ).toEqual(['addresses.0.city']);
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(failedFields({ name: 'Acme', deletedAt: '2026-01-01' })).toEqual([
      'unrecognized_keys',
    ]);
  });
});

describe('listCustomersQuerySchema', () => {
  it('turns limit and offset into numbers', () => {
    expect(
      listCustomersQuerySchema.parse({ limit: '10', offset: '20' }),
    ).toEqual({ limit: 10, offset: 20 });
  });

  it('rejects an unknown sort field and a limit over 100', () => {
    const result = listCustomersQuerySchema.safeParse({
      sortBy: 'password',
      limit: '500',
    });
    expect(result.success).toBe(false);
  });
});

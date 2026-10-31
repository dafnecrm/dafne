import { customerBodySchema, listCustomersQuerySchema } from './customers.ts';

/** Paths of the fields that failed, e.g. ['name', 'addresses.0.city']. */
function failedFields(body: unknown) {
  const result = customerBodySchema.safeParse(body);
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.') || issue.code);
}

// The fields every body needs, so each test only lists what it checks.
const company = { type: 'company', name: 'Acme', email: 'info@acme.test' };
const person = { ...company, type: 'person' };

describe('customerBodySchema', () => {
  it('trims values and turns blank optional fields into null', () => {
    const body = customerBodySchema.parse({
      type: 'company',
      name: '  Acme  ',
      email: ' info@acme.test ',
      phone: '',
      addresses: [
        {
          type: 'billing',
          street: ' Via Roma 1 ',
          city: 'Milano',
          country: 'Italy',
          region: '',
        },
      ],
    });

    expect(body).toMatchObject({
      name: 'Acme',
      email: 'info@acme.test',
      phone: null,
    });
    expect(body.addresses[0]).toMatchObject({
      street: 'Via Roma 1',
      region: null,
      type: 'billing',
    });
  });

  it('turns missing optional fields into null and addresses into []', () => {
    expect(customerBodySchema.parse(company)).toEqual({
      type: 'company',
      name: 'Acme',
      birthDate: null,
      fiscalCode: null,
      vatNumber: null,
      email: 'info@acme.test',
      phone: null,
      addresses: [],
    });
  });

  it('rejects a blank name, a bad email and a bad phone', () => {
    expect(
      failedFields({
        type: 'company',
        name: '   ',
        email: 'not-an-email',
        phone: 'call me',
      }),
    ).toEqual(['name', 'email', 'phone']);
  });

  it('accepts common phone formats', () => {
    for (const phone of ['+39 02 1234 5678', '(555) 123-4567', '02.123.456']) {
      expect(failedFields({ ...company, phone })).toEqual([]);
    }
  });

  it('validates each address', () => {
    expect(
      failedFields({
        ...company,
        addresses: [
          { type: 'billing', street: 'Via Roma 1', city: '', country: 'Italy' },
        ],
      }),
    ).toEqual(['addresses.0.city']);
  });

  it('allows one address of each type', () => {
    const address = { street: 'Via Roma 1', city: 'Milano', country: 'Italy' };
    expect(
      failedFields({
        ...company,
        addresses: [
          { ...address, type: 'billing' },
          { ...address, type: 'shipping' },
          { ...address, type: 'billing' },
        ],
      }),
    ).toEqual(['addresses.2.type']);
  });

  it('rejects unknown properties such as deletedAt', () => {
    expect(failedFields({ ...company, deletedAt: '2026-01-01' })).toEqual([
      'unrecognized_keys',
    ]);
  });

  it('requires the type and the email', () => {
    expect(failedFields({ name: 'Acme', email: 'info@acme.test' })).toEqual([
      'type',
    ]);
    expect(failedFields({ type: 'company', name: 'Acme' })).toEqual(['email']);
  });

  it('checks the fiscal code and the VAT number, in upper case', () => {
    expect(
      customerBodySchema.parse({
        type: 'person',
        name: 'Mario Rossi',
        email: 'info@acme.test',
        fiscalCode: 'rssmra80a01h501u',
      }),
    ).toMatchObject({ fiscalCode: 'RSSMRA80A01H501U' });
    expect(
      customerBodySchema.parse({
        type: 'company',
        name: 'Acme',
        email: 'info@acme.test',
        vatNumber: 'it12345678901',
      }),
    ).toMatchObject({ vatNumber: 'IT12345678901' });
    expect(failedFields({ ...person, fiscalCode: 'RSSMRA80' })).toEqual([
      'fiscalCode',
    ]);
    expect(failedFields({ ...company, vatNumber: '1234' })).toEqual([
      'vatNumber',
    ]);
  });

  it("clears the other type's fields", () => {
    expect(
      customerBodySchema.parse({
        type: 'person',
        name: 'Mario Rossi',
        email: 'info@acme.test',
        birthDate: '1980-01-01',
        fiscalCode: 'RSSMRA80A01H501U',
        vatNumber: '12345678901',
      }),
    ).toMatchObject({
      birthDate: new Date('1980-01-01'),
      fiscalCode: 'RSSMRA80A01H501U',
      vatNumber: null,
    });
    expect(
      customerBodySchema.parse({
        type: 'company',
        name: 'Acme',
        email: 'info@acme.test',
        birthDate: '1980-01-01',
        fiscalCode: 'RSSMRA80A01H501U',
        vatNumber: '12345678901',
      }),
    ).toMatchObject({
      birthDate: null,
      fiscalCode: null,
      vatNumber: '12345678901',
    });
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

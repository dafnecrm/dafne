import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CustomerBodyDto } from './customer-body.dto.js';

/** Transforms and validates like the global ValidationPipe. */
async function check(body: object) {
  const dto = plainToInstance(CustomerBodyDto, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, fields: errors.map((e) => e.property) };
}

describe('CustomerBodyDto', () => {
  it('trims values and turns blank optional fields into null', async () => {
    const { dto, fields } = await check({
      name: '  Acme  ',
      email: ' ',
      phone: '',
      addresses: [
        { street: ' Via Roma 1 ', city: 'Milano', country: 'Italy', region: '' },
      ],
    });

    expect(fields).toEqual([]);
    expect(dto).toMatchObject({ name: 'Acme', email: null, phone: null });
    expect(dto.addresses?.[0]).toMatchObject({
      street: 'Via Roma 1',
      region: null,
    });
  });

  it('rejects a blank name, a bad email and a bad phone', async () => {
    const { fields } = await check({
      name: '   ',
      email: 'not-an-email',
      phone: 'call me',
    });

    expect(fields).toEqual(['name', 'email', 'phone']);
  });

  it('accepts common phone formats', async () => {
    for (const phone of ['+39 02 1234 5678', '(555) 123-4567', '02.123.456']) {
      expect((await check({ name: 'A', phone })).fields).toEqual([]);
    }
  });

  it('validates each address', async () => {
    const { fields } = await check({
      name: 'Acme',
      addresses: [{ street: 'Via Roma 1', city: '', country: 'Italy' }],
    });

    expect(fields).toEqual(['addresses']);
  });

  it('rejects unknown properties such as deletedAt', async () => {
    const { fields } = await check({ name: 'Acme', deletedAt: '2026-01-01' });

    expect(fields).toEqual(['deletedAt']);
  });
});

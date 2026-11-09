import { optionalUuid, requiredUuid } from './common.ts';
import { msg } from './messages/index.ts';

const UUID = '0193f1e2-7c4a-7b3d-9e8f-1a2b3c4d5e6f';
const error = msg('common.number.invalid');

describe('requiredUuid', () => {
  const schema = requiredUuid(error);

  it('takes a uuid, trimmed', () => {
    expect(schema.parse(` ${UUID} `)).toBe(UUID);
  });

  it('rejects a blank value, a number and text that is not a uuid', () => {
    for (const value of ['', '  ', 42, 'abc', UUID.slice(1), undefined, null])
      expect(schema.safeParse(value).success).toBe(false);
  });
});

describe('optionalUuid', () => {
  const schema = optionalUuid(error);

  it('turns blank, null and missing into null', () => {
    for (const value of ['', '  ', null, undefined]) expect(schema.parse(value)).toBeNull();
  });

  it('takes a uuid and rejects anything else', () => {
    expect(schema.parse(UUID)).toBe(UUID);
    expect(schema.safeParse('abc').success).toBe(false);
  });
});

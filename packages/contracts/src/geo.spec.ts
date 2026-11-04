import { geoSearchQuerySchema } from './geo.ts';

describe('geoSearchQuerySchema', () => {
  it('trims the search and turns the limit into a number', () => {
    expect(geoSearchQuerySchema.parse({ q: ' via roma ', limit: '3' })).toEqual(
      { q: 'via roma', limit: 3 },
    );
  });

  it('rejects a blank search, a limit over 10 and unknown params', () => {
    expect(geoSearchQuerySchema.safeParse({ q: '  ' }).success).toBe(false);
    expect(
      geoSearchQuerySchema.safeParse({ q: 'roma', limit: '50' }).success,
    ).toBe(false);
    expect(
      geoSearchQuerySchema.safeParse({ q: 'roma', format: 'xml' }).success,
    ).toBe(false);
  });
});

import { listChangesQuerySchema } from './changelog.ts';

describe('listChangesQuerySchema', () => {
  it('takes limit and offset from the query string', () => {
    expect(listChangesQuerySchema.parse({ limit: '10', offset: '20' })).toEqual({ limit: 10, offset: 20 });
    expect(listChangesQuerySchema.parse({})).toEqual({});
  });

  it('rejects other params and out-of-range values', () => {
    for (const query of [{ sortBy: 'id' }, { limit: '0' }, { limit: '101' }, { offset: '-1' }]) {
      expect(listChangesQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});

import { listUsersQuerySchema } from './users.ts';

describe('listUsersQuerySchema', () => {
  it('turns limit and offset into numbers and keeps the filters', () => {
    expect(
      listUsersQuerySchema.parse({
        limit: '10',
        offset: '0',
        role: 'admin',
        banned: 'true',
        sortBy: 'createdAt',
        sortDirection: 'desc',
      }),
    ).toEqual({
      limit: 10,
      offset: 0,
      role: 'admin',
      banned: 'true',
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
  });

  it('rejects a bad banned value, sort field or unknown param', () => {
    for (const query of [
      { banned: 'yes' },
      { sortBy: 'password' },
      { foo: '1' },
    ]) {
      expect(listUsersQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});

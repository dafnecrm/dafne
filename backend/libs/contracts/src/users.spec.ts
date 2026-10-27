import { createUserBodySchema, listUsersQuerySchema } from './users.ts';

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

describe('createUserBodySchema', () => {
  const valid = {
    firstname: ' Ada ',
    lastname: 'Lovelace',
    email: ' ada@example.com ',
    password: 'Str0ng!pass',
  };

  it('trims names and email and defaults the role to user', () => {
    expect(createUserBodySchema.parse(valid)).toEqual({
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      password: 'Str0ng!pass',
      role: 'user',
    });
  });

  it('rejects a weak password, an unknown role and unknown fields', () => {
    for (const body of [
      { ...valid, password: 'password' },
      { ...valid, role: 'owner' },
      { ...valid, emailVerified: false },
    ]) {
      expect(createUserBodySchema.safeParse(body).success).toBe(false);
    }
  });
});

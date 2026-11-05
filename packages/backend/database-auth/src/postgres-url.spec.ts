import { postgresUrl } from './postgres-url.ts';

describe('postgresUrl', () => {
  it('accepts postgres:// and postgresql:// URLs', () => {
    expect(postgresUrl('postgres://dafne:x@localhost:5432/dafne')).toBe(
      'postgres://dafne:x@localhost:5432/dafne',
    );
    expect(postgresUrl('postgresql://localhost/dafne')).toBe(
      'postgresql://localhost/dafne',
    );
  });

  it('rejects other URLs, without echoing the credentials', () => {
    expect(() =>
      postgresUrl('mysql://root:secret@localhost:3306/dafne_auth'),
    ).toThrow(
      'DATABASE_URL must be a Postgres URL (postgres://user:pass@host:5432/dafne), not mysql://…',
    );
    expect(() =>
      postgresUrl('mysql://root:secret@localhost:3306/dafne_auth'),
    ).not.toThrow(/secret/);
  });
});

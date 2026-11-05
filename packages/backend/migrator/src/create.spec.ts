import pg from 'pg';
import { createDatabase, databaseTarget } from './create.ts';

describe('databaseTarget', () => {
  it('reads database, role and password from the URL', () => {
    expect(
      databaseTarget('postgres://dafne:s%40cret@localhost:5432/dafne'),
    ).toEqual({
      database: 'dafne',
      role: 'dafne',
      password: 's@cret',
    });
    expect(
      databaseTarget('postgresql://dafne@db/dafne').password,
    ).toBeUndefined();
  });

  it('needs a database and a user', () => {
    expect(() => databaseTarget('postgres://dafne@localhost:5432')).toThrow(
      'no database',
    );
    expect(() => databaseTarget('postgres://localhost/dafne')).toThrow(
      'no user',
    );
    expect(() => databaseTarget('mysql://dafne@localhost/dafne')).toThrow(
      "isn't a Postgres URL",
    );
  });
});

/*
 * Against a real Postgres: MIGRATOR_TEST_ADMIN_URL=postgres://postgres:…@127.0.0.1:5433/postgres
 * (a superuser on a throwaway server: it creates and drops ctest_dafne).
 */
const adminUrl = process.env.MIGRATOR_TEST_ADMIN_URL;

describe.skipIf(!adminUrl)('createDatabase (Postgres)', () => {
  const name = 'ctest_dafne';
  const query = async (sql: string, params: unknown[] = []) => {
    const client = new pg.Client({ connectionString: adminUrl });
    await client.connect();
    try {
      return (await client.query(sql, params)).rows;
    } finally {
      await client.end();
    }
  };
  const reset = async () => {
    await query(`DROP DATABASE IF EXISTS ${name}`);
    await query(`DROP ROLE IF EXISTS ${name}`);
  };
  const url = () => {
    const target = new URL(adminUrl!);
    target.username = name;
    target.password = 'secret';
    target.pathname = `/${name}`;
    return target.toString();
  };

  beforeEach(reset);
  afterEach(reset);

  it('creates the role and a UTF8, ICU database it owns, once', async () => {
    expect(await createDatabase({ adminUrl: adminUrl!, url: url() })).toEqual({
      role: 'created',
      database: 'created',
    });
    const [db] = await query(
      `SELECT pg_encoding_to_char(encoding) AS encoding, datlocprovider AS provider, pg_get_userbyid(datdba) AS owner
         FROM pg_database WHERE datname = $1`,
      [name],
    );
    expect(db).toEqual({ encoding: 'UTF8', provider: 'i', owner: name });

    // The role can sign in with the URL's password and create schemas.
    const client = new pg.Client({ connectionString: url() });
    await client.connect();
    await client.query('CREATE SCHEMA sales');
    await client.end();

    expect(await createDatabase({ adminUrl: adminUrl!, url: url() })).toEqual({
      role: 'exists',
      database: 'exists',
    });
  });
});

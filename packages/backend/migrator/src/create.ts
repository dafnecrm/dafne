import pg from 'pg';

/*
 * `pnpm dafne db create`: the Dafne database and its owner, the role the
 * migrator connects with. Both come from MIGRATIONS_DATABASE_URL
 * (postgres://dafne:secret@host:5432/dafne → role dafne, password secret,
 * database dafne); a superuser (ADMIN_DATABASE_URL) creates them. What
 * exists already is left as it is.
 */

/** What MIGRATIONS_DATABASE_URL names: the database and its owner. */
export interface DatabaseTarget {
  database: string;
  role: string;
  /** Undefined: the role is created without one (e.g. trust or peer auth). */
  password?: string;
}

export function databaseTarget(url: string): DatabaseTarget {
  const parsed = new URL(url);
  if (!/^postgres(ql)?:$/.test(parsed.protocol))
    throw new Error(`${parsed.protocol} isn't a Postgres URL.`);
  const database = decodeURIComponent(parsed.pathname.slice(1));
  const role = decodeURIComponent(parsed.username);
  if (!database)
    throw new Error(
      'MIGRATIONS_DATABASE_URL names no database (…:5432/dafne).',
    );
  if (!role)
    throw new Error(
      'MIGRATIONS_DATABASE_URL names no user (postgres://dafne:…@…).',
    );
  return {
    database,
    role,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
  };
}

export interface CreateDatabaseOptions {
  /** A superuser's URL (or a role with CREATEROLE and CREATEDB), e.g. postgres://postgres:…@host:5432/postgres. */
  adminUrl: string;
  /** MIGRATIONS_DATABASE_URL: the database and owner to create. */
  url: string;
  /** ICU locale of the database (sorting, case): `und`, Unicode's default order. */
  icuLocale?: string;
  /** LC_COLLATE / LC_CTYPE, for what ICU doesn't cover. */
  locale?: string;
  log?: (line: string) => void;
}

export interface CreateDatabaseResult {
  role: 'created' | 'exists';
  database: 'created' | 'exists';
}

/**
 * Creates the owner role (LOGIN, with the URL's password) and the database
 * (UTF8, ICU collation, owned by the role, from template0), each only if
 * missing. For an existing database it warns when encoding, provider or
 * owner differ from what it would have created.
 */
export async function createDatabase({
  adminUrl,
  url,
  icuLocale = 'und',
  locale = 'C.UTF-8',
  log = () => {},
}: CreateDatabaseOptions): Promise<CreateDatabaseResult> {
  const { database, role, password } = databaseTarget(url);
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const id = (name: string) => client.escapeIdentifier(name);
    const literal = (value: string) => client.escapeLiteral(value);
    const result: CreateDatabaseResult = { role: 'exists', database: 'exists' };

    const roles = await client.query(
      'SELECT 1 FROM pg_roles WHERE rolname = $1',
      [role],
    );
    if (roles.rowCount === 0) {
      await client.query(
        `CREATE ROLE ${id(role)} LOGIN${password ? ` PASSWORD ${literal(password)}` : ''}`,
      );
      result.role = 'created';
      log(`Role ${role} created.`);
    } else log(`Role ${role} exists: left as it is (password included).`);

    const { rows } = await client.query<{
      encoding: string;
      provider: string;
      owner: string;
    }>(
      `SELECT pg_encoding_to_char(d.encoding) AS encoding, d.datlocprovider AS provider, r.rolname AS owner
         FROM pg_database d JOIN pg_roles r ON r.oid = d.datdba
        WHERE d.datname = $1`,
      [database],
    );
    const [existing] = rows;
    if (!existing) {
      // Not in a transaction: CREATE DATABASE can't run in one.
      await client.query(
        `CREATE DATABASE ${id(database)} OWNER ${id(role)} TEMPLATE template0 ENCODING 'UTF8'` +
          ` LOCALE_PROVIDER icu ICU_LOCALE ${literal(icuLocale)} LOCALE ${literal(locale)}`,
      );
      result.database = 'created';
      log(
        `Database ${database} created (UTF8, ICU ${icuLocale}, owner ${role}).`,
      );
    } else {
      log(`Database ${database} exists: left as it is.`);
      if (existing.encoding !== 'UTF8')
        log(`  warning: its encoding is ${existing.encoding}, not UTF8.`);
      if (existing.provider !== 'i')
        log(
          "  warning: its collation isn't ICU (lists may sort uppercase first).",
        );
      if (existing.owner !== role)
        log(`  warning: it's owned by ${existing.owner}, not ${role}.`);
    }
    return result;
  } finally {
    await client.end();
  }
}

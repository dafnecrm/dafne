/** Postgres error codes (SQLSTATE). */
export enum PostgresErrorCode {
  UNIQUE_VIOLATION = '23505',
  FOREIGN_KEY_VIOLATION = '23503',
}

/** What a Postgres error says about the failure. */
export interface PostgresError {
  code: string;
  /** The constraint that failed, '' when there's none. */
  constraint: string;
}

/**
 * The Postgres error behind `error`, which drizzle wraps as the cause, or
 * undefined if it isn't one.
 */
export function postgresError(error: unknown): PostgresError | undefined {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!(cause instanceof Error)) {
    return undefined;
  }
  const { code, constraint } = cause as { code?: unknown; constraint?: unknown };
  if (typeof code !== 'string') {
    return undefined;
  }
  return { code, constraint: typeof constraint === 'string' ? constraint : '' };
}

/** A Postgres error to turn into another error (usually a client one). */
export interface PostgresErrorRule {
  code: PostgresErrorCode;
  /** The constraint's exact name, or a pattern; any constraint if omitted. */
  constraint?: string | RegExp;
  /** The error to throw instead. */
  error: () => Error;
}

/**
 * A `.catch` handler that throws the error of the first rule matching the
 * Postgres error, and rethrows anything else, e.g.
 * `.catch(rethrowPostgresError([{ code: PostgresErrorCode.UNIQUE_VIOLATION,
 * constraint: 'customer_email_unique_idx', error: () => new ConflictException() }]))`.
 */
export function rethrowPostgresError(rules: PostgresErrorRule[]) {
  return (error: unknown): never => {
    const pg = postgresError(error);
    if (pg) {
      const rule = rules.find(
        ({ code, constraint }) =>
          code === pg.code &&
          (constraint === undefined ||
            (typeof constraint === 'string'
              ? constraint === pg.constraint
              : constraint.test(pg.constraint))),
      );
      if (rule) {
        throw rule.error();
      }
    }
    throw error;
  };
}

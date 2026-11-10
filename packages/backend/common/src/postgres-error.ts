import {
  BadRequestException,
  ConflictException,
  type HttpException,
} from '@nestjs/common';
import { msg } from '@dafne/contracts';

/** Postgres error codes (SQLSTATE). */
export enum PostgresErrorCode {
  UNIQUE_VIOLATION = '23505',
  FOREIGN_KEY_VIOLATION = '23503',
  NOT_NULL_VIOLATION = '23502',
  CHECK_VIOLATION = '23514',
  STRING_TOO_LONG = '22001',
  NUMBER_OUT_OF_RANGE = '22003',
  INVALID_TEXT_REPRESENTATION = '22P02',
}

/** What a Postgres error says about the failure. */
export interface PostgresError {
  code: string;
  /** The constraint that failed, '' when there's none. */
  constraint: string;
  /** Postgres's detail ('Key (id)=(1) is still referenced…'), '' when none. */
  detail: string;
}

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * The Postgres error behind `error`, which drizzle wraps as the cause, or
 * undefined if it isn't one.
 */
export function postgresError(error: unknown): PostgresError | undefined {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  if (!(cause instanceof Error)) {
    return undefined;
  }
  const { code, constraint, detail } = cause as {
    code?: unknown;
    constraint?: unknown;
    detail?: unknown;
  };
  if (typeof code !== 'string') {
    return undefined;
  }
  return { code, constraint: text(constraint), detail: text(detail) };
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
 * What no rule matches reaches PostgresErrorInterceptor, which answers with
 * a generic message.
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

/**
 * The generic client error for a Postgres error that a request's data
 * caused, or undefined for the others (connection, syntax…), which stay a
 * 500. A 409 when the data clashes with what's saved, a 400 when it's wrong.
 */
export function defaultPostgresException(
  pg: PostgresError,
): HttpException | undefined {
  switch (pg.code) {
    case PostgresErrorCode.UNIQUE_VIOLATION:
      return new ConflictException(msg('database.duplicate'));
    case PostgresErrorCode.FOREIGN_KEY_VIOLATION:
      // Deleting a record others point to, or pointing to a missing one.
      return pg.detail.includes('is still referenced')
        ? new ConflictException(msg('database.stillReferenced'))
        : new BadRequestException(msg('database.missingReference'));
    case PostgresErrorCode.NOT_NULL_VIOLATION:
      return new BadRequestException(msg('database.required'));
    case PostgresErrorCode.CHECK_VIOLATION:
    case PostgresErrorCode.STRING_TOO_LONG:
    case PostgresErrorCode.NUMBER_OUT_OF_RANGE:
    case PostgresErrorCode.INVALID_TEXT_REPRESENTATION:
      return new BadRequestException(msg('database.invalid'));
    default:
      return undefined;
  }
}

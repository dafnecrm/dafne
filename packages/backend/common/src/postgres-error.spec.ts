import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  postgresError,
  PostgresErrorCode,
  rethrowPostgresError,
} from './postgres-error.js';

/** A Postgres error wrapped by drizzle, as its cause. */
const wrapped = (code: string, constraint?: string) =>
  new Error('query failed', {
    cause: Object.assign(new Error('pg'), { code, constraint }),
  });

describe('postgresError', () => {
  it('reads the code and constraint, also from the cause', () => {
    expect(postgresError(wrapped('23505', 'x_pkey'))).toEqual({
      code: '23505',
      constraint: 'x_pkey',
      detail: '',
    });
    expect(postgresError(Object.assign(new Error(), { code: '23503' }))).toEqual(
      { code: '23503', constraint: '', detail: '' },
    );
  });

  it('is undefined for anything else', () => {
    expect(postgresError(new Error('boom'))).toBeUndefined();
    expect(postgresError('boom')).toBeUndefined();
  });
});

describe('rethrowPostgresError', () => {
  const rethrow = rethrowPostgresError([
    {
      code: PostgresErrorCode.UNIQUE_VIOLATION,
      constraint: 'x_pkey',
      error: () => new ConflictException(),
    },
    {
      code: PostgresErrorCode.FOREIGN_KEY_VIOLATION,
      constraint: /country_code/,
      error: () => new BadRequestException(),
    },
  ]);

  it('throws the error of the matching rule', () => {
    expect(() => rethrow(wrapped('23505', 'x_pkey'))).toThrow(
      ConflictException,
    );
    expect(() => rethrow(wrapped('23503', 'a_country_code_fkey'))).toThrow(
      BadRequestException,
    );
  });

  it('rethrows anything else as it is', () => {
    for (const error of [
      wrapped('23505', 'other_pkey'),
      wrapped('23503', 'a_customer_id_fkey'),
      new Error('boom'),
    ]) {
      expect(() => rethrow(error)).toThrow(error);
    }
  });

  it('matches any constraint when the rule has none', () => {
    const any = rethrowPostgresError([
      {
        code: PostgresErrorCode.UNIQUE_VIOLATION,
        error: () => new ConflictException(),
      },
    ]);
    expect(() => any(wrapped('23505'))).toThrow(ConflictException);
  });
});

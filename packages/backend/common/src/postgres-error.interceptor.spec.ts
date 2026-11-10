import {
  BadRequestException,
  ConflictException,
  Logger,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { PostgresErrorInterceptor } from './postgres-error.interceptor.js';

/** A Postgres error wrapped by drizzle, as its cause. */
const wrapped = (code: string, extra: { constraint?: string; detail?: string } = {}) =>
  new Error('query failed', {
    cause: Object.assign(new Error('pg'), { code, ...extra }),
  });

/** What the interceptor makes of a handler that fails with `error`. */
async function intercept(error: unknown, type = 'http') {
  const context = { getType: () => type } as ExecutionContext;
  const next: CallHandler = { handle: () => throwError(() => error) };
  try {
    await firstValueFrom(new PostgresErrorInterceptor().intercept(context, next));
  } catch (thrown) {
    return thrown;
  }
  return expect.unreachable();
}

describe('PostgresErrorInterceptor', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  it('turns a constraint no service handled into a 409 or 400', async () => {
    const duplicate = await intercept(wrapped('23505', { constraint: 'x_idx' }));
    expect(duplicate).toBeInstanceOf(ConflictException);
    expect((duplicate as ConflictException).message).toBe('database.duplicate');

    const missing = await intercept(
      wrapped('23503', { detail: 'Key (customer_id)=(9) is not present in table "customer".' }),
    );
    expect(missing).toBeInstanceOf(BadRequestException);
    expect((missing as BadRequestException).message).toBe('database.missingReference');

    const referenced = await intercept(
      wrapped('23503', { detail: 'Key (id)=(1) is still referenced from table "sales_order".' }),
    );
    expect(referenced).toBeInstanceOf(ConflictException);

    for (const code of ['23502', '23514', '22001', '22003', '22P02']) {
      expect(await intercept(wrapped(code))).toBeInstanceOf(BadRequestException);
    }
  });

  it('leaves alone what a service already turned into an HTTP error', async () => {
    const handled = new ConflictException('customers.email.taken');
    expect(await intercept(handled)).toBe(handled);
  });

  it('leaves alone other errors, Postgres ones included', async () => {
    const boom = new Error('boom');
    expect(await intercept(boom)).toBe(boom);
    // A connection failure isn't the request's fault: still a 500.
    const connection = wrapped('08006');
    expect(await intercept(connection)).toBe(connection);
  });

  it('only maps HTTP requests', async () => {
    const error = wrapped('23505');
    expect(await intercept(error, 'rpc')).toBe(error);
  });
});

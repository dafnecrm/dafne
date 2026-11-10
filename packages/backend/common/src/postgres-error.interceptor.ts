import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, throwError, type Observable } from 'rxjs';
import { defaultPostgresException, postgresError } from './postgres-error.js';

/**
 * The safety net for the Postgres errors no service turned into a client
 * error (with `rethrowPostgresError`): a request that breaks a constraint
 * gets a generic 409 or 400 instead of a 500. Register it in the app
 * (`{ provide: APP_INTERCEPTOR, useClass: PostgresErrorInterceptor }`); the
 * exception it throws then goes through I18nExceptionFilter, so it's
 * translated. HTTP requests only.
 */
@Injectable()
export class PostgresErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PostgresErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    return next.handle().pipe(
      catchError((error: unknown) => {
        const pg = postgresError(error);
        const exception = pg && defaultPostgresException(pg);
        if (!exception) {
          return throwError(() => error);
        }
        // A rule is missing: say which constraint, to add one.
        this.logger.warn(
          `Postgres ${pg.code}${pg.constraint ? ` on ${pg.constraint}` : ''} without a rule: ${exception.getStatus()}`,
        );
        return throwError(() => exception);
      }),
    );
  }
}

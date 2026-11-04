import {
  ArgumentsHost,
  Catch,
  HttpException,
  type ExceptionFilter,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import { localeFrom, translate, zodErrorMap } from './i18n.js';
import {
  issueMessages,
  ZodValidationException,
} from './zod-validation.pipe.js';

/**
 * Translates HTTP errors into the request's language (Accept-Language):
 * messages that are contract keys ("customers.notFound", or
 * "path: key" for validation), and Zod's own messages. Everything else is
 * left to Nest's default handling.
 */
@Catch()
export class I18nExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException) || host.getType() !== 'http')
      return super.catch(exception, host);

    const request = host.switchToHttp().getRequest<Request>();
    const locale = localeFrom(request.headers['accept-language']);
    const body = exception.getResponse();
    let message =
      typeof body === 'string'
        ? body
        : (body as { message?: string | string[] }).message;

    if (exception instanceof ZodValidationException) {
      const result = exception.schema.safeParse(exception.input, {
        error: zodErrorMap(locale),
      });
      if (!result.success) message = issueMessages(result.error);
    }
    if (message === undefined) return super.catch(exception, host);

    const translated = Array.isArray(message)
      ? message.map((m) => translate(m, locale))
      : translate(message, locale);
    const response =
      typeof body === 'string'
        ? { statusCode: exception.getStatus(), message: translated }
        : { ...body, message: translated };
    super.catch(new HttpException(response, exception.getStatus()), host);
  }
}

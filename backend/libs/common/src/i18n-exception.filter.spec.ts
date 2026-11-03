import {
  ArgumentsHost,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { msg, requiredText } from '@app/contracts';
import { z } from 'zod';
import { I18nExceptionFilter } from './i18n-exception.filter.js';
import { ZodValidationPipe } from './zod-validation.pipe.js';

/** Runs the filter for a request in `language` and returns what it sends. */
function handle(exception: unknown, language: string) {
  const sent = vi
    .spyOn(BaseExceptionFilter.prototype, 'catch')
    .mockImplementation(() => undefined);
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'accept-language': language } }),
    }),
  } as unknown as ArgumentsHost;
  new I18nExceptionFilter().catch(exception, host);
  const [error] = sent.mock.calls[0];
  sent.mockRestore();
  return (error as HttpException).getResponse() as { message: unknown };
}

describe('I18nExceptionFilter', () => {
  it('translates a key message', () => {
    expect(
      handle(new NotFoundException(msg('customers.notFound')), 'it-IT').message,
    ).toBe('Cliente non trovato');
  });

  it('translates validation errors, Zod messages included', () => {
    const pipe = new ZodValidationPipe(
      z.object({ name: requiredText(5, msg('customers.name.required')) }),
    );
    const fail = (name: string) => {
      try {
        pipe.transform({ name });
      } catch (error) {
        return error;
      }
    };
    expect(handle(fail(' '), 'it').message).toEqual([
      'name: Inserisci il nome',
    ]);
    expect(handle(fail(' '), 'en').message).toEqual(['name: Enter the name']);
    const [tooLong] = handle(fail('far too long'), 'it').message as string[];
    expect(tooLong).toMatch(/^name: Troppo/);
  });
});

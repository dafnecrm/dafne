import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** One "path: message" per issue, as the API returns them. */
export const issueMessages = (error: z.ZodError) =>
  error.issues.map((issue) =>
    issue.path.length
      ? `${issue.path.join('.')}: ${issue.message}`
      : issue.message,
  );

/**
 * A validation failure. It keeps the schema and the input, so
 * I18nExceptionFilter can parse again with Zod's messages in the request's
 * language.
 */
export class ZodValidationException extends BadRequestException {
  constructor(
    readonly schema: z.ZodType,
    readonly input: unknown,
    error: z.ZodError,
  ) {
    super(issueMessages(error));
  }
}

/**
 * Validates and transforms a request part with a Zod schema, e.g.
 * `@Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody`.
 * Fails with 400 and one message per issue ("path: message"). Messages are
 * contract keys (or Zod's English text); I18nExceptionFilter translates them.
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }
    throw new ZodValidationException(this.schema, value, result.error);
  }
}

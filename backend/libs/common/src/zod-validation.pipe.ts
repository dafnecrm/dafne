import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/**
 * Validates and transforms a request part with a Zod schema, e.g.
 * `@Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody`.
 * Fails with 400 and one message per issue ("path: message").
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    throw new BadRequestException(
      result.error.issues.map((issue) =>
        issue.path.length
          ? `${issue.path.join('.')}: ${issue.message}`
          : issue.message,
      ),
    );
  }
}

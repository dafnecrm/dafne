import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({ name: z.string().trim().min(1), tags: z.array(z.string()) }),
  );

  it('returns the parsed value', () => {
    expect(pipe.transform({ name: ' Acme ', tags: [] })).toEqual({
      name: 'Acme',
      tags: [],
    });
  });

  it('fails with 400 and one "path: message" per issue', () => {
    try {
      pipe.transform({ name: ' ', tags: [1] });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const { message } = (error as BadRequestException).getResponse() as {
        message: string[];
      };
      expect(message).toHaveLength(2);
      expect(message[0]).toMatch(/^name: /);
      expect(message[1]).toMatch(/^tags\.0: /);
    }
  });
});

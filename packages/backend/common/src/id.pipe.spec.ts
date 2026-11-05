import { NotFoundException } from '@nestjs/common';
import { IdPipe } from './id.pipe.js';

describe('IdPipe', () => {
  const pipe = new IdPipe();

  it('turns a positive integer into a number', () => {
    expect(pipe.transform('42')).toBe(42);
  });

  it('is a 404 for anything that cannot be an id', () => {
    for (const value of ['abc', '0', '-1', '1.5', '01', '', '2147483648'])
      expect(() => pipe.transform(value)).toThrow(NotFoundException);
  });
});

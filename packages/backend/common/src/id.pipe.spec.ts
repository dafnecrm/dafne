import { NotFoundException } from '@nestjs/common';
import { IdPipe, TextIdPipe, UuidPipe } from './id.pipe.js';

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

describe('UuidPipe', () => {
  const pipe = new UuidPipe();

  it('keeps a uuid, lowercased', () => {
    expect(pipe.transform('0193F1E2-7C4A-7B3D-9E8F-1A2B3C4D5E6F')).toBe(
      '0193f1e2-7c4a-7b3d-9e8f-1a2b3c4d5e6f',
    );
  });

  it('is a 404 for anything that is not a uuid', () => {
    for (const value of ['abc', '42', '', '0193f1e2-7c4a-7b3d-9e8f-1a2b3c4d5e6'])
      expect(() => pipe.transform(value)).toThrow(NotFoundException);
  });
});

describe('TextIdPipe', () => {
  const pipe = new TextIdPipe(5);

  it('keeps an id that fits the column', () => {
    expect(pipe.transform('ab-12')).toBe('ab-12');
  });

  it('is a 404 for a blank id or one longer than the column', () => {
    for (const value of ['', 'abcdef'])
      expect(() => pipe.transform(value)).toThrow(NotFoundException);
  });
});

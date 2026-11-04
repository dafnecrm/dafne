import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import { KIT_FILES, qualify } from './qualify.ts';
import * as kit from './kit/better-auth.ts';
import * as qualified from './better-auth.ts';

describe('qualified tables', () => {
  it.each(KIT_FILES)('src/%s is up to date with src/kit (run tables:qualify)', (file) => {
    const source = readFileSync(join(import.meta.dirname, 'kit', file), 'utf8');
    expect(readFileSync(join(import.meta.dirname, file), 'utf8')).toBe(qualify(source, file));
  });

  it('are the kit tables, in dafne_auth', () => {
    const config = getTableConfig(qualified.user);
    expect(config.schema).toBe('dafne_auth');
    expect(config.columns.map((c) => c.name)).toEqual(getTableConfig(kit.user).columns.map((c) => c.name));
  });
});

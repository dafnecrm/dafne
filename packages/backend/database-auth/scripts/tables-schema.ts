// Moves the Better Auth CLI's tables into the auth schema (see src/into-schema.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { intoAuthSchema } from '../src/into-schema.ts';

const file = join(import.meta.dirname, '..', 'src', 'better-auth.ts');
writeFileSync(file, intoAuthSchema(readFileSync(file, 'utf8')));
console.log('src/better-auth.ts: tables in the auth schema.');

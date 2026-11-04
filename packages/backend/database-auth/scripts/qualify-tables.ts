// Writes src/<file>.ts from src/kit/<file>.ts (see src/qualify.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { KIT_FILES, qualify } from '../src/qualify.ts';

const src = join(import.meta.dirname, '..', 'src');
for (const file of KIT_FILES) {
  writeFileSync(join(src, file), qualify(readFileSync(join(src, 'kit', file), 'utf8'), file));
  console.log(`src/${file} ← src/kit/${file}`);
}

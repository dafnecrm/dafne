import ejs from 'ejs';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** templates/ next to src/ (dev) or dist/ (built). */
function templatesDir() {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = join(dir, 'templates');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('The CLI templates folder is missing.');
    dir = parent;
  }
}

const TEMPLATES = templatesDir();

/** Renders templates/<name>.ejs. `<%= %>` writes raw text: the output is code, not HTML. */
export function render(name: string, data: object): string {
  const file = join(TEMPLATES, `${name}.ejs`);
  return ejs.render(readFileSync(file, 'utf8'), data, {
    filename: file,
    escape: (value: unknown) => String(value),
  });
}

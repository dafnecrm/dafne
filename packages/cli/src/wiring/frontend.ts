import { applyEdits, modify, parse } from 'jsonc-parser';
import type { Changes } from '../core/changes.ts';
import { FRONTEND, frontendLib, frontendPackage } from '../core/workspace.ts';
import { arrayProperty, editSource, ensureArrayElement, quoteOf, variableObject } from './ast.ts';
import { ensureDependency, ensureReference } from './backend.ts';

export const NEXT_CONFIG = `${FRONTEND}/next.config.ts`;
export const FRONTEND_TSCONFIG = `${FRONTEND}/tsconfig.json`;

const JSON_FORMAT = { formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' } };

/**
 * Registers a frontend lib in apps/sales-web: its dependency, Next's
 * `transpilePackages` (it ships sources), `nx.sync.ignoredDependencies` in
 * the frontend's tsconfig (Next compiles the sources, no project
 * references) and the root's project reference, as `nx sync` would write
 * it. The new package still needs `pnpm install` to be linked.
 */
export function wireFrontendLib(changes: Changes, lib: string) {
  const name = frontendPackage(lib);
  ensureDependency(changes, `${FRONTEND}/package.json`, name, 'workspace:*');

  changes.update(NEXT_CONFIG, (source) =>
    editSource(NEXT_CONFIG, source, (file) => {
      const q = quoteOf(file);
      const config = () => variableObject(file, 'nextConfig');
      ensureArrayElement(file, arrayProperty(file, config, 'transpilePackages'), `${q}${name}${q}`);
    }),
  );

  changes.update(FRONTEND_TSCONFIG, (source) => ensureIgnoredDependency(source, name));
  ensureReference(changes, 'tsconfig.json', `./${frontendLib(lib)}`);
}

/** Adds `name` to `nx.sync.ignoredDependencies` of a tsconfig, unless it's there. */
function ensureIgnoredDependency(source: string, name: string) {
  const path = ['nx', 'sync', 'ignoredDependencies'];
  const current = (parse(source) as { nx?: { sync?: { ignoredDependencies?: string[] } } }).nx?.sync
    ?.ignoredDependencies;
  if (current?.includes(name)) return source;
  const edits = current
    ? modify(source, [...path, current.length], name, { ...JSON_FORMAT, isArrayInsertion: true })
    : modify(source, path, [name], JSON_FORMAT);
  return applyEdits(source, edits);
}

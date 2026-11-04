import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flushChanges, FsTree } from 'nx/src/generators/tree.js';
import { Changes } from '../src/core/changes.ts';

/** Copies of the real files the generators edit (refresh them when those change). */
export const FIXTURE = join(import.meta.dirname, 'fixtures', 'project');

/** A temporary copy of the fixture project. */
export function fixtureCopy(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), `dafne-${prefix}-`));
  cpSync(FIXTURE, root, { recursive: true });
  return root;
}

/** An Nx tree over a folder on disk, as `nx g` uses. */
export const diskTree = (root: string) => new FsTree(root, false);

/** A change set over a folder on disk. */
export const diskChanges = (root: string) => new Changes(diskTree(root));

/** Formats and writes a change set, as Nx does after a generator. */
export async function commit(changes: Changes) {
  await changes.format();
  flushChanges(changes.root, changes.tree.listChanges());
}

export const reader = (root: string) => (path: string) => readFileSync(join(root, path), 'utf8');

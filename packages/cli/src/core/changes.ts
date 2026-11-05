import type { Tree } from '@nx/devkit';
import { join } from 'node:path';
import { formatSource } from './format.ts';

export type ChangeKind = 'create' | 'update';

interface Change {
  kind: ChangeKind;
  /** Format even if the file wasn't Prettier-formatted before. */
  format?: boolean;
  /** Content before this run, for updates. */
  original?: string;
}

export interface ChangeSummary {
  path: string;
  kind: ChangeKind;
}

/**
 * The files a generator creates and updates, on top of an Nx `Tree`. Nx
 * keeps the tree in memory and writes it only when the generator succeeds
 * (and never with --dry-run), so a failed run leaves the workspace as it
 * was. Paths are relative to the workspace root, with forward slashes.
 *
 * It has the interface of the old CLI's change set, so the field, sync and
 * wiring code works on it unchanged.
 */
export class Changes {
  readonly tree: Tree;
  readonly warnings: string[] = [];
  private readonly changes = new Map<string, Change>();
  private readonly force: boolean;

  constructor(tree: Tree, options: { force?: boolean } = {}) {
    this.tree = tree;
    this.force = options.force ?? false;
  }

  get root() {
    return this.tree.root;
  }

  /** Whether the file exists in the tree (on disk or created in this run). */
  exists(path: string) {
    return this.tree.exists(path) && this.tree.isFile(path);
  }

  read(path: string): string | undefined {
    return this.exists(path) ? (this.tree.read(path, 'utf-8') ?? undefined) : undefined;
  }

  /** The names of the entries of a folder (empty when it's missing). */
  list(dir: string): string[] {
    return this.tree.exists(dir) ? this.tree.children(dir) : [];
  }

  /** Adds a new file (text, or a Buffer for binaries). Fails if it already exists, unless `force`. */
  create(path: string, content: string | Buffer) {
    if (this.changes.has(path)) throw new Error(`${path} is generated twice in the same run.`);
    if (this.exists(path) && !this.force) throw new Error(`${path} already exists. Pass --force to overwrite it.`);
    this.changes.set(path, { kind: 'create' });
    this.tree.write(path, content);
  }

  /** Rewrites an existing file; `edit` returns the same text when nothing changes. */
  update(path: string, edit: (source: string) => string, options: { format?: boolean } = {}) {
    const source = this.read(path);
    if (source === undefined) throw new Error(`${path} not found: it's needed to register the new code.`);
    const content = edit(source);
    if (content === source) return;
    const previous = this.changes.get(path);
    this.changes.set(path, {
      kind: previous?.kind ?? 'update',
      original: previous ? previous.original : source,
      format: options.format || previous?.format,
    });
    this.tree.write(path, content);
  }

  warn(message: string) {
    this.warnings.push(message);
  }

  summary(): ChangeSummary[] {
    return [...this.changes].map(([path, { kind }]) => ({ path, kind }));
  }

  /**
   * Formats the changed files with Prettier and the target package's
   * config: new files always, edited ones only if they were formatted
   * before (several backend files aren't, e.g. sales-api.module.ts).
   */
  async format() {
    for (const [path, change] of this.changes) {
      const content = this.read(path)!;
      const formatted = await formatSource(
        join(this.root, path),
        content,
        change.format ? undefined : change.original,
        this.newPrettierConfig(path),
      );
      if (formatted !== content) this.tree.write(path, formatted);
    }
  }

  /**
   * The nearest .prettierrc of a file when this run created it (Prettier
   * only sees the disk). Undefined when the nearest one was already there.
   */
  private newPrettierConfig(path: string): Record<string, unknown> | undefined {
    const parts = path.split('/').slice(0, -1);
    for (let i = parts.length; i >= 0; i--) {
      const rc = [...parts.slice(0, i), '.prettierrc'].join('/');
      if (!this.exists(rc)) continue;
      if (this.changes.get(rc)?.kind !== 'create') return undefined;
      try {
        return JSON.parse(this.read(rc)!) as Record<string, unknown>;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatSource } from './format.js';

export type ChangeKind = 'create' | 'update';

interface Change {
  kind: ChangeKind;
  content: string;
  /** Content on disk before this run, for updates. */
  original?: string;
}

export interface ChangeSummary {
  path: string;
  kind: ChangeKind;
}

/**
 * The files a run creates and updates, kept in memory until `commit`, so a
 * conflict or an error leaves the project untouched. Paths are relative to
 * the Dafne root, with forward slashes.
 */
export class Changes {
  private readonly changes = new Map<string, Change>();
  readonly warnings: string[] = [];

  /** Files that would have been updated, when updates are skipped. */
  readonly skipped = new Set<string>();

  constructor(
    readonly root: string,
    private readonly options: { force?: boolean; skipUpdates?: boolean } = {},
  ) {}

  private get force() {
    return this.options.force ?? false;
  }

  /** Whether the file exists on disk or is created in this run. */
  exists(path: string) {
    return this.changes.has(path) || existsSync(this.abs(path));
  }

  /** Current content: this run's version, or the one on disk. */
  read(path: string): string | undefined {
    const change = this.changes.get(path);
    if (change) return change.content;
    const abs = this.abs(path);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : undefined;
  }

  /** Adds a new file. Fails if it already exists, unless --force. */
  create(path: string, content: string) {
    if (this.changes.has(path))
      throw new Error(`${path} is generated twice in the same run.`);
    if (existsSync(this.abs(path)) && !this.force)
      throw new Error(
        `${path} already exists. Pass --force to overwrite it.`,
      );
    this.changes.set(path, { kind: 'create', content });
  }

  /** Rewrites an existing file; `edit` returns the same text when nothing changes. */
  update(path: string, edit: (source: string) => string) {
    // Files created in this run are always completed (e.g. a new @Module).
    if (this.options.skipUpdates && this.changes.get(path)?.kind !== 'create') {
      this.skipped.add(path);
      return;
    }
    const source = this.read(path);
    if (source === undefined)
      throw new Error(`${path} not found: it's needed to register the new code.`);
    const content = edit(source);
    if (content === source) return;
    const previous = this.changes.get(path);
    this.changes.set(path, {
      kind: previous?.kind ?? 'update',
      content,
      original: previous ? previous.original : source,
    });
  }

  warn(message: string) {
    this.warnings.push(message);
  }

  summary(): ChangeSummary[] {
    return [...this.changes].map(([path, { kind }]) => ({ path, kind }));
  }

  /** Formats and writes every change. */
  async commit() {
    for (const [path, change] of this.changes) {
      const abs = this.abs(path);
      const content = await formatSource(abs, change.content, change.original);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
  }

  private abs(path: string) {
    return join(this.root, path);
  }
}

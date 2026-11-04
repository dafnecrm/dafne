import type { Changes } from '../core/changes.js';
import type { ResourceNames } from '../core/names.js';

export interface ResourceOptions {
  /** lucide-react icon for the sidebar and the empty list. */
  icon: string;
  /** Sidebar section. */
  section: string;
  admin: boolean;
}

export interface Ctx {
  changes: Changes;
  names: ResourceNames;
  options: ResourceOptions;
}

/** A piece of a resource: the files it creates and what it registers. */
export interface Piece {
  description: string;
  /** Pieces this one needs; generated too when their `marker` is missing. */
  deps: string[];
  /** A file whose existence means the piece is already there. */
  marker: (names: ResourceNames) => string | undefined;
  generate: (ctx: Ctx) => void;
}

/**
 * Generates `requested` pieces (in order) and, before each, the missing
 * pieces it depends on. Returns the keys of the pieces added as
 * dependencies.
 */
export function generatePieces(
  pieces: Record<string, Piece>,
  requested: string[],
  ctx: Ctx,
): string[] {
  const done = new Set<string>();
  const addedDeps: string[] = [];

  const visit = (key: string, explicit: boolean) => {
    if (done.has(key)) return;
    done.add(key);
    const piece = pieces[key];
    if (!piece) throw new Error(`Unknown piece "${key}".`);
    if (!explicit) {
      const marker = piece.marker(ctx.names);
      if (marker && ctx.changes.exists(marker)) return;
      addedDeps.push(key);
    }
    for (const dep of piece.deps) visit(dep, requested.includes(dep));
    piece.generate(ctx);
  };

  for (const key of requested) visit(key, true);
  return addedDeps;
}

import type { Changes } from '../core/changes.ts';
import type { ResourceNames } from '../core/names.ts';

export interface Ctx {
  changes: Changes;
  names: ResourceNames;
  /** The backend app new libs are wired into (apps/<app>). */
  app: string;
}

/** A piece of a resource: the files it creates and what it registers. */
export interface Piece {
  description: string;
  /** Pieces this one needs; generated too when their `marker` is missing. */
  deps: string[];
  /** A file whose existence means the piece is already there. */
  marker: (names: ResourceNames) => string;
  generate: (ctx: Ctx) => void;
}

/**
 * Generates `requested` pieces (in order) and, before each, the missing
 * pieces it depends on. Returns the keys of the pieces added as
 * dependencies.
 */
export function generatePieces(pieces: Record<string, Piece>, requested: string[], ctx: Ctx): string[] {
  const done = new Set<string>();
  const addedDeps: string[] = [];

  const visit = (key: string, explicit: boolean) => {
    if (done.has(key)) return;
    done.add(key);
    const piece = pieces[key];
    if (!piece) throw new Error(`Unknown piece "${key}".`);
    if (!explicit) {
      if (ctx.changes.exists(piece.marker(ctx.names))) return;
      addedDeps.push(key);
    }
    for (const dep of piece.deps) visit(dep, requested.includes(dep));
    piece.generate(ctx);
  };

  for (const key of requested) visit(key, true);
  return addedDeps;
}

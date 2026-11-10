import type { Changes } from '../core/changes.ts';
import type { IdSpec } from '../core/id.ts';
import type { ResourceNames } from '../core/names.ts';

export interface Ctx {
  changes: Changes;
  names: ResourceNames;
  /** The app the resource goes into (apps/<app>): a backend app for backend pieces, a frontend one for frontend pieces. */
  app: string;
  /** The primary key of a new backend resource; serial when unset. */
  id?: IdSpec;
}

/** A piece of a resource: the files it creates and what it registers. */
export interface Piece<C extends Ctx = Ctx> {
  description: string;
  /** Pieces this one needs; generated too when their `marker` is missing. */
  deps: string[];
  /** A file whose existence means the piece is already there (none: always generated as a dependency). */
  marker: (names: ResourceNames, ctx: C) => string | undefined;
  generate: (ctx: C) => void;
}

/**
 * Generates `requested` pieces (in order) and, before each, the missing
 * pieces it depends on. Returns the keys of the pieces added as
 * dependencies.
 */
export function generatePieces<C extends Ctx>(pieces: Record<string, Piece<C>>, requested: string[], ctx: C): string[] {
  const done = new Set<string>();
  const addedDeps: string[] = [];

  const visit = (key: string, explicit: boolean) => {
    if (done.has(key)) return;
    done.add(key);
    const piece = pieces[key];
    if (!piece) throw new Error(`Unknown piece "${key}".`);
    if (!explicit) {
      const marker = piece.marker(ctx.names, ctx);
      if (marker && ctx.changes.exists(marker)) return;
      addedDeps.push(key);
    }
    for (const dep of piece.deps) visit(dep, requested.includes(dep));
    piece.generate(ctx);
  };

  for (const key of requested) visit(key, true);
  return addedDeps;
}

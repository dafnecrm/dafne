import type { Tree } from '@nx/devkit';
import { FRONTEND_RESOURCE } from '../../pieces/frontend.ts';
import { generateFrontendPieces, type FrontendPieceSchema } from '../frontend-pieces.ts';

/** The whole frontend of a resource: list, detail and form pages, server actions, data and the sidebar link. */
export default async function frontendResourceGenerator(tree: Tree, options: FrontendPieceSchema) {
  return generateFrontendPieces(tree, options, FRONTEND_RESOURCE);
}

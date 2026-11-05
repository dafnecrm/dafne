import type { Tree } from '@nx/devkit';
import { generateFrontendPieces, type FrontendPieceSchema } from '../frontend-pieces.ts';

/** A resource's link in the sidebar. */
export default async function frontendNavGenerator(tree: Tree, options: FrontendPieceSchema) {
  return generateFrontendPieces(tree, options, ['nav']);
}

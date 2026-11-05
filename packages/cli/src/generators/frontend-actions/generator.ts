import type { Tree } from '@nx/devkit';
import { generateFrontendPieces, type FrontendPieceSchema } from '../frontend-pieces.ts';

/** The server actions, the form schema and the delete dialog of a resource. */
export default async function frontendActionsGenerator(tree: Tree, options: FrontendPieceSchema) {
  return generateFrontendPieces(tree, options, ['actions']);
}

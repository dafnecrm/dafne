import type { Tree } from '@nx/devkit';
import { generateFrontendPieces, type FrontendPieceSchema } from '../frontend-pieces.ts';

/** The detail page of a resource, synced with the contract. */
export default async function frontendDetailGenerator(tree: Tree, options: FrontendPieceSchema) {
  return generateFrontendPieces(tree, options, ['detail']);
}

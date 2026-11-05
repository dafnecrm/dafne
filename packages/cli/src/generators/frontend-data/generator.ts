import type { Tree } from '@nx/devkit';
import { generateFrontendPieces, type FrontendPieceSchema } from '../frontend-pieces.ts';

/** The data module of a resource: API types and fetchers, and the table config. */
export default async function frontendDataGenerator(tree: Tree, options: FrontendPieceSchema) {
  return generateFrontendPieces(tree, options, ['data']);
}

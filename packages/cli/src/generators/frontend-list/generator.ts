import type { Tree } from '@nx/devkit';
import { generateFrontendPieces, type FrontendPieceSchema } from '../frontend-pieces.ts';

/** The list page of a resource (table, columns, row actions), synced with the contract. */
export default async function frontendListGenerator(tree: Tree, options: FrontendPieceSchema) {
  return generateFrontendPieces(tree, options, ['list']);
}

import type { Tree } from '@nx/devkit';
import { resourceNames } from '../../core/names.ts';
import { DEFAULT_APP } from '../../core/workspace.ts';
import { backendPieces } from '../../pieces/backend.ts';
import { resourceMessages, syncMessages } from '../../wiring/messages.ts';
import { runGenerator } from '../run.ts';

export interface ContractSchema {
  name: string;
  force?: boolean;
}

/**
 * A contract in packages/contracts/src/<plural>.ts (with its spec):
 * request schemas and response types, exported from the package index.
 */
export default async function contractGenerator(tree: Tree, options: ContractSchema) {
  return runGenerator(tree, options, (changes) => {
    const names = resourceNames(options.name);
    backendPieces.contract.generate({ changes, names, app: DEFAULT_APP });
    syncMessages(changes, { contracts: resourceMessages(names).contracts });
    return { next: ['pnpm nx test @dafne/contracts'] };
  });
}

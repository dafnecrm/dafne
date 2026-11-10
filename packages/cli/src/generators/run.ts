import { logger, type GeneratorCallback, type Tree } from '@nx/devkit';
import { Changes } from '../core/changes.ts';

/** What a generator reports when it's done. */
export interface Outcome {
  /** Pieces generated because they were missing. */
  dependencies?: string[];
  /** Commands to run afterwards, printed once the files are written. */
  next: string[];
}

/**
 * Runs `generate` on a change set over the Nx tree, then formats the
 * changed files and prints the warnings. Nx writes the tree only if this
 * succeeds (and never with --dry-run); the returned callback, which prints
 * the next steps, runs after the write.
 */
export async function runGenerator(
  tree: Tree,
  options: { force?: boolean },
  generate: (changes: Changes) => Outcome | Promise<Outcome>,
): Promise<GeneratorCallback> {
  const changes = new Changes(tree, { force: options.force });
  const { dependencies = [], next } = await generate(changes);
  await changes.format();

  if (!changes.summary().length) {
    logger.warn('Nothing to do: everything is already there.');
  }
  if (dependencies.length) {
    logger.info(`Also generated, since they were missing: ${dependencies.join(', ')}.`);
  }
  for (const warning of changes.warnings) {
    logger.warn(warning);
  }

  return () => {
    if (!next.length) {
      return;
    }
    logger.info('\nNext steps:');
    for (const step of next) {
      logger.info(`  ${step}`);
    }
  };
}

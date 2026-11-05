import { migrationCopyPatterns } from '@dafne/backend-migrator/bundle';
import { rspack } from '@rspack/core';
import nodeExternals from 'webpack-node-externals';

/*
 * Nest's rspack defaults, except that:
 * - workspace packages (@dafne/*) are bundled: they ship TypeScript
 *   sources, so Node can't load them from node_modules at runtime;
 * - the migrations of every database are copied into dist/migrations, for
 *   MIGRATE_ON_START (see src/main.ts).
 */
export default (options) => ({
  ...options,
  externals: [
    nodeExternals({ importType: 'module', allowlist: [/^@dafne\//] }),
    // Nest's other externals (Node builtins) stay as they are.
    ...options.externals.slice(1),
  ],
  plugins: [
    ...options.plugins,
    new rspack.CopyRspackPlugin({
      patterns: migrationCopyPatterns(import.meta.dirname),
    }),
  ],
});

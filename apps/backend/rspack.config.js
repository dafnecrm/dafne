import nodeExternals from 'webpack-node-externals';

/*
 * Nest's rspack defaults, except that workspace packages (@dafne/*) are
 * bundled: they ship TypeScript sources, so Node can't load them from
 * node_modules at runtime.
 */
export default (options) => ({
  ...options,
  externals: [
    nodeExternals({ importType: 'module', allowlist: [/^@dafne\//] }),
    // Nest's other externals (Node builtins) stay as they are.
    ...options.externals.slice(1),
  ],
});

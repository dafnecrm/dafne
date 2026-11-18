import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// The model comparison (eval/): real models, so slow and not in CI.
// pnpm nx eval @dafne/backend-assistant (see eval/README.md).
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: '@dafne/backend-assistant:eval',
    globals: true,
    include: ['eval/**/*.eval.ts'],
    testTimeout: 300_000,
    // One model at a time: local machines can't run two.
    fileParallelism: false,
  },
});

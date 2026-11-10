import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // SWC compiles the TypeScript instead of Vite's default transformer, because Nest
  // needs decorators and their type metadata (emitDecoratorMetadata).
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: '2e',
    globals: true,
    include: ['test/**/*.e2e-spec.ts'],
  },
});

import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC compiles the TypeScript instead of Vite's default transformer, because Nest
  // needs decorators and their type metadata (emitDecoratorMetadata).
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: '@dafne/backend-changelog',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});

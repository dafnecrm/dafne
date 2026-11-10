import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { name: '@dafne/cli', globals: true, testTimeout: 30_000 },
});

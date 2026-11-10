import { defineConfig } from 'vitest/config';

// Only for the VS Code Vitest extension: it runs every package's config as a
// project of one Vitest, so running a folder runs all the tests in it.
// `pnpm test` and Nx still run each package's own config.
export default defineConfig({
  test: {
    projects: [
      'apps/*/vitest.config.ts',
      'packages/*/vitest.config.ts',
      'packages/backend/*/vitest.config.ts',
      'packages/frontend/*/vitest.config.ts',
    ],
  },
});

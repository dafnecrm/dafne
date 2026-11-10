import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@dafne/backend-migrator',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});

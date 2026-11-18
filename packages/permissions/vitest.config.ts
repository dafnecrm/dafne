import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@dafne/permissions',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});

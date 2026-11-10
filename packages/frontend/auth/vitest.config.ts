import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@dafne/frontend-auth',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});

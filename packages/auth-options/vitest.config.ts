import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@dafne/auth-options',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});

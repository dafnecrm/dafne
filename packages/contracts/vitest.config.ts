import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@dafne/contracts',
    globals: true,
    include: ['src/**/*.spec.ts'],
  },
});

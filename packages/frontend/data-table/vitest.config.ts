import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-data-table",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

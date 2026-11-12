import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-changelog",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

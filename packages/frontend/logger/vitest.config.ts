import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-logger",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

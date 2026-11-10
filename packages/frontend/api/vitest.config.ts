import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-api",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

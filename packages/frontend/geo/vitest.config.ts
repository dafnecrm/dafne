import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-geo",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

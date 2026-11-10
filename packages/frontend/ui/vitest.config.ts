import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-ui",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

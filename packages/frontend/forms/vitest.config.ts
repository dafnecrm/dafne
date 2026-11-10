import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-forms",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

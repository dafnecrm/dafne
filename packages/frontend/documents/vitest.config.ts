import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-documents",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

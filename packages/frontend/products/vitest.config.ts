import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-products",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

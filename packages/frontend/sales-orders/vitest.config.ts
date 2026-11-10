import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-sales-orders",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

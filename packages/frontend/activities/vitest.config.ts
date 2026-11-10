import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-activities",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

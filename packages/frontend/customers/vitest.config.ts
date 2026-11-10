import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-customers",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-users",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

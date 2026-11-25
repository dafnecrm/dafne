import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@dafne/frontend-tasks",
    globals: true,
    include: ["src/**/*.spec.ts"],
  },
});

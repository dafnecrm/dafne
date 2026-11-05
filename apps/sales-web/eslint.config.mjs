import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { boundaries } from "../../packages/frontend/eslint.config.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Imports only frontend and shared packages (tools/boundaries.mjs).
  boundaries,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

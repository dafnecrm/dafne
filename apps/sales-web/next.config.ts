import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * The monorepo root: the workspace packages (@dafne/contracts,
 * @dafne/frontend-auth) live outside apps/sales-web/, so Turbopack must
 * build from the root to read them.
 */
const root = path.join(__dirname, "../..");

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript sources.
  transpilePackages: [
    "@dafne/contracts",
    "@dafne/frontend-auth",
    "@dafne/frontend-api",
    "@dafne/frontend-ui",
    "@dafne/frontend-forms",
    "@dafne/frontend-data-table",
    "@dafne/frontend-customers",
    "@dafne/frontend-geo",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  // Keep the dev badge off the sidebar's user menu (bottom-left).
  devIndicators: { position: "bottom-right" },
  // Better Auth runs in apps/auth (shared by the apps); the browser calls it
  // on this origin, so there's no CORS and its session cookies belong to the
  // frontend (to the parent domain with COOKIE_DOMAIN in apps/auth).
  rewrites() {
    const auth = process.env.AUTH_URL ?? "http://localhost:3001";
    return [
      { source: "/api/auth/:path*", destination: `${auth}/api/auth/:path*` },
    ];
  },
  outputFileTracingRoot: root,
  turbopack: {
    root,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

/** Points next-intl at i18n/request.ts (the per-request locale and messages). */
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);

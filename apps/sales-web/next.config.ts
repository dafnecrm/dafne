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
    "@dafne/permissions",
    "@dafne/frontend-auth",
    "@dafne/frontend-api",
    "@dafne/frontend-ui",
    "@dafne/frontend-forms",
    "@dafne/frontend-data-table",
    "@dafne/frontend-customers",
    "@dafne/frontend-geo",
    "@dafne/frontend-activities",
    "@dafne/frontend-products",
    "@dafne/frontend-sales-orders",
    "@dafne/frontend-changelog",
    "@dafne/frontend-assistant",
    "@dafne/frontend-user-groups",
    "@dafne/frontend-permissions",
    "@dafne/frontend-users",
    "@dafne/frontend-documents",
    "@dafne/frontend-logger",
    "@dafne/frontend-tasks",
  ],
  // Loaded from node_modules by instrumentation.node.ts, not bundled.
  serverExternalPackages: ["@opentelemetry/sdk-node"],
  cacheComponents: true,
  experimental: {
    // `next upgrade --agent` applies security releases.
    agentUpgrade: "security",
  },
  partialPrefetching: true,
  // Keep the dev badge off the sidebar's user menu (bottom-left).
  devIndicators: { position: "bottom-right" },
  // `dafne dev` serves the apps at https://<app>.dafne.localhost: next dev
  // only serves its dev assets and HMR to the origins listed here.
  allowedDevOrigins: ["*.dafne.localhost"],
  // Better Auth runs in apps/auth (shared by the apps); the browser calls it
  // on this origin, so there's no CORS and its session cookies belong to the
  // frontend (to the parent domain with COOKIE_DOMAIN in apps/auth).
  //
  // The browser's telemetry (Grafana Faro, <Telemetry />) posts to
  // /telemetry on this origin too, so ad blockers let it through: it goes
  // on to FARO_URL (the alloy service in development, Grafana Cloud's Faro
  // collector in production). Without FARO_URL there's no telemetry.
  rewrites() {
    const auth = process.env.AUTH_URL ?? "http://localhost:3001";
    const faro = process.env.FARO_URL;
    return [
      { source: "/api/auth/:path*", destination: `${auth}/api/auth/:path*` },
      ...(faro ? [{ source: "/telemetry", destination: faro }] : []),
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

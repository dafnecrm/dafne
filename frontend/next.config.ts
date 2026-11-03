import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * The parent folder with backend/ and frontend/ side by side: the frontend
 * imports the backend's API contracts (libs/contracts), so both must be
 * inside the root Turbopack builds from.
 */
const root = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Keep the dev badge off the sidebar's user menu (bottom-left).
  devIndicators: { position: "bottom-right" },
  // Better Auth runs on the backend; the browser calls it on this origin, so
  // there's no CORS and its session cookies belong to the frontend.
  rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:3000";
    return [
      { source: "/api/auth/:path*", destination: `${backend}/api/auth/:path*` },
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

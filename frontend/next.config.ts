import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Keep the dev badge off the sidebar's user menu (bottom-left).
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  // Better Auth runs on the backend; the browser calls it on this origin, so
  // there's no CORS and its session cookies belong to the frontend.
  rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:3000";
    return [{ source: "/api/auth/:path*", destination: `${backend}/api/auth/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

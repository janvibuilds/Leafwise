import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local subdomain hosts used for auth/session testing.
  allowedDevOrigins: ["lvh.me", "*.lvh.me", "app.localhost", "*.localhost"],
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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

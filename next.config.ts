import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  // Sentry build options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in production CI
  silent: !process.env.CI,

  // Disable source map upload if no auth token
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Automatically tree-shake Sentry logger statements
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },

  // Hide source maps from users
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip type checking during build (handled separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Skip static generation for pages that use Clerk
  // These will be rendered at runtime
  experimental: {
    // Don't fail build on prerender errors for dynamic pages
  },
  // Trailing slash configuration
  trailingSlash: false,
};

export default nextConfig;

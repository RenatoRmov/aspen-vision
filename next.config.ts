import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // Bundles the pre-seeded demo SQLite file into every serverless function so
  // src/lib/db.ts can copy it into /tmp on cold start. Remove once a real
  // hosted database is configured.
  outputFileTracingIncludes: {
    "/**": ["./prisma/demo-seed.db"],
  },
};

export default nextConfig;

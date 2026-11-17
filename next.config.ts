import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@prisma/client': './app/generated/prisma',
    },
  },
};

export default nextConfig;

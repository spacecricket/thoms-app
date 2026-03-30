import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright"],
  turbopack: {
    resolveAlias: {
      '@prisma/client': './app/generated/prisma',
    },
  },
};

export default nextConfig;

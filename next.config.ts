import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      '@prisma/client': './app/generated/prisma',
    },
  },
};

export default nextConfig;

// Lets `next dev` see Cloudflare bindings; no-op outside development.
initOpenNextCloudflareForDev();

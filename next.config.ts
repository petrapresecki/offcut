import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;

// Gives `next dev` local D1 and R2 bindings (stored in .wrangler/).
initOpenNextCloudflareForDev();

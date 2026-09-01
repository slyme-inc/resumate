import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ["mammoth"],
  transpilePackages: ["@superdoc-dev/react", "@superdoc-dev/fonts", "superdoc"],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

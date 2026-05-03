import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["node:sqlite"],
  },
};

export default nextConfig;

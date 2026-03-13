import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsHmrCache: false,
  },
  serverExternalPackages: ["@prisma/client"],
}

export default nextConfig

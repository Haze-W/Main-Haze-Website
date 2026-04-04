import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["better-auth"],
  devIndicators: false,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "better-auth/react": path.join(
        process.cwd(),
        "node_modules/better-auth/dist/client/react/index.mjs"
      ),
    };
    return config;
  },
};

export default nextConfig;

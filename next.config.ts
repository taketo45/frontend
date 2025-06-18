import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      buffer: require.resolve('buffer'),
      encoding: false,
    };
    return config;
  },
  experimental: {
    esmExternals: false,
  },
};

export default nextConfig;

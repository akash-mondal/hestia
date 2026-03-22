import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@zeno/blockchain'],
  images: {
    qualities: [75, 95],
  },
};

export default nextConfig;

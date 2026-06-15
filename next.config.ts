import type { NextConfig } from "next";

const basePath = "/hiring-agent";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  },
};

export default nextConfig;

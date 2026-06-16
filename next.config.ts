import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH in env to deploy under a subpath (e.g. /hiring-agent).
// Leave it unset (or empty) to deploy at the root of a domain (e.g. openats.shabad.sbs).
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "",
  },
};

export default nextConfig;

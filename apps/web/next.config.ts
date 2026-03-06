import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@proestimate/ui", "@proestimate/shared"],
};

export default nextConfig;

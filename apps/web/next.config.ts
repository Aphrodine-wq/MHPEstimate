import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@proestimate/ui", "@proestimate/shared", "@proestimate/estimation-engine"],
};

export default nextConfig;

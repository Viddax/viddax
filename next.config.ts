import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubActions ? '/Viddax' : '',
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;

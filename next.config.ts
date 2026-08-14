import type { NextConfig } from "next";

const isGithubPages = process.env.IS_GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  output: "export",
  basePath: isGithubPages ? '/viddax' : '',
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;

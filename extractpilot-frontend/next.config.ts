import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui"],
  // Default rewrite proxy timeout is 30s — extract-emails can block longer (IMAP + worker poll).
  experimental: {
    proxyTimeout: 210_000,
  },
  async rewrites() {
    const api = process.env.API_URL ?? "http://localhost:3002";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${api}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

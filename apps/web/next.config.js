import process from "node:process";

/** @type {import('next').NextConfig} */
const apiInternalUrl = (
  process.env.API_INTERNAL_URL ?? "http://localhost:3001"
).replace(/\/+$/, "");

new URL(apiInternalUrl);

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

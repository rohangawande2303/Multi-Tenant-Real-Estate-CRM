import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Proxy /api/v1/* requests through Next.js to avoid cross-domain cookie and CORS issues between Vercel and Render
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    if (backendUrl && backendUrl.startsWith("http")) {
      const origin = backendUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
      return [
        {
          source: "/api/v1/:path*",
          destination: `${origin}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;

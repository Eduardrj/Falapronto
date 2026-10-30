import type { NextConfig } from "next";

// Export estático: a mesma pasta "out/" vira o site (Vercel, Cloudflare Pages, Hostinger)
// e o conteúdo do APK (Capacitor).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

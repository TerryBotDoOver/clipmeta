import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack root so it doesn't pick up an unrelated lockfile higher up
  // (there's a stray package.json at C:\Users\levib that was confusing the resolver)
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    "@ffmpeg-installer/ffmpeg",
    "@ffprobe-installer/ffprobe",
    "basic-ftp",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "150mb",
    },
  },
};

export default nextConfig;
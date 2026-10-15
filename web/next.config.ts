import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (see ../Dockerfile).
  output: "standalone",
  images: {
    // Card media is served by app/media/[...path]/route.ts.
    localPatterns: [{ pathname: "/media/**", search: "" }],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;

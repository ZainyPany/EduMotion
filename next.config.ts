import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages rely on native binaries or dynamic requires and must not be
  // bundled by the compiler. Marking them external lets the server load them at
  // runtime instead — required for the video compilation pipeline to work.
  serverExternalPackages: [
    "puppeteer",
    "fluent-ffmpeg",
    "@ffmpeg-installer/ffmpeg",
    "pdf-parse",
  ],
};

export default nextConfig;

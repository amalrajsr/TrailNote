import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  images: {
    loader: "custom",
    loaderFile: "./src/lib/imagekit-loader.ts",
  },
  experimental: {
    // The CLI checker uses a detached child process, which is unavailable in
    // restricted build environments. TypeScript 5 provides the compiler API.
    useTypeScriptCli: false,
  },
};

export default nextConfig;

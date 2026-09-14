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
  async headers() {
    const imageOrigin = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
      ? new URL(process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT).origin
      : "";
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "frame-ancestors 'none'",
              imageOrigin
                ? `img-src 'self' data: blob: ${imageOrigin}`
                : "img-src 'self' data: blob:",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
            ]
              .filter(Boolean)
              .join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

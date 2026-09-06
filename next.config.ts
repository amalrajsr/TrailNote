import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The CLI checker uses a detached child process, which is unavailable in
    // restricted build environments. TypeScript 5 provides the compiler API.
    useTypeScriptCli: false,
  },
};

export default nextConfig;

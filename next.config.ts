import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client 含原生依赖 — 不打进 bundle，运行时直接加载。
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;

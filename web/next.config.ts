import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sol alttaki Next.js geliştirme göstergesini gizle; derleme/çalışma hataları yine gösterilir.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

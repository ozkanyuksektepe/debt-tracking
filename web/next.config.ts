import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sol alttaki Next.js geliştirme göstergesini gizle; derleme/çalışma hataları yine gösterilir.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Ekstre dosyaları Server Action ile yüklenir (backend sınırı 15 MB, çok parçalı gövde payı dahil).
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
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

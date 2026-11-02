import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: pkg.version },
  // Alles is per aanvraag dynamisch (database + Teamleader); geen component-caching.
  cacheComponents: false,
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
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

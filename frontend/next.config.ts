import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    const to = (source: string, destination: string) => ({ source, destination, permanent: false });

    return [
      to("/staff", "/staff/login"),
      to("/admin", "/staff/login"),
      to("/forgot-password", "/staff/forgot-password"),
      to("/reset-password", "/staff/reset-password"),
      to("/signup", "/register"),
      to("/mine", "/my-reports"),
    ];
  },
  experimental: {
    serverActions: {
      // Laravel accepts photos up to 4 MB; the rest is multipart overhead.
      bodySizeLimit: "4200kb",
    },
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

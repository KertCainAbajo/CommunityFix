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
      to("/login", "/staff/login"),
      to("/forgot-password", "/staff/forgot-password"),
      to("/reset-password", "/staff/reset-password"),
      // Residents no longer have accounts.
      to("/register", "/report"),
      to("/mine", "/track"),
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

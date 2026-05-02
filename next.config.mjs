import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ? process.env.ALLOWED_DEV_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  ...(allowedDevOrigins.length ? { allowedDevOrigins } : {}),
  // Pin Turbopack's root to this worktree so it uses the local node_modules,
  // not the parent repo's node_modules (which lack the win32 lightningcss binary).
  turbopack: {
    root: __dirname
  },
  async redirects() {
    return [
      // Friendly URLs that people type or paste from external campaigns
      { source: "/machines", destination: "/#machines", permanent: false },
      { source: "/contact", destination: "/#contact", permanent: false },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Laravel namespaces every route under /api (the original NestJS backend
    // didn't), so the base URL must include it.
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api',
  },
};

module.exports = nextConfig;

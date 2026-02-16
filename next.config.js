/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/app', // Serve under /app path through nginx gateway
  images: {
    domains: [],
  },
  output: 'standalone', // For Docker builds
}

module.exports = nextConfig

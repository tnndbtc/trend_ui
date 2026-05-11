/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/app', // Serve under /app path through nginx gateway
  images: {
    domains: [],
  },
  output: 'standalone', // For Docker builds
  async rewrites() {
    // Proxy /api/v1/* → FastAPI backend on port 8002.
    // This lets NEXT_PUBLIC_CRAWLER_API_BASE_URL=/api/v1 (relative) work
    // whether the app is accessed via localhost or LAN IP, and avoids
    // browser CORS issues since requests hit the same origin.
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8002/api/v1/:path*',
        basePath: false,
      },
      {
        source: '/api/stories/:path*',
        destination: 'http://127.0.0.1:8003/api/stories/:path*',
        basePath: false,
      },
      {
        source: '/api/story-sets/:path*',
        destination: 'http://127.0.0.1:8003/api/story-sets/:path*',
        basePath: false,
      },
      {
        source: '/api/analytics/:path*',
        destination: 'http://127.0.0.1:8003/api/analytics/:path*',
        basePath: false,
      },
      {
        source: '/api/subscribers/refresh',
        destination: 'http://127.0.0.1:8003/api/subscribers/refresh',
        basePath: false,
      },
      {
        source: '/api/subscribers',
        destination: 'http://127.0.0.1:8003/api/subscribers',
        basePath: false,
      },
      {
        source: '/api/comments/refresh',
        destination: 'http://127.0.0.1:8003/api/comments/refresh',
        basePath: false,
      },
      {
        source: '/api/comments',
        destination: 'http://127.0.0.1:8003/api/comments',
        basePath: false,
      },
    ]
  },
}

module.exports = nextConfig

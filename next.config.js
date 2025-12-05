/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'lh3.googleusercontent.com', 'ui-avatars.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  // Handle trailing slashes consistently
  trailingSlash: false,
  // Output standalone for Docker deployment
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
}

module.exports = nextConfig

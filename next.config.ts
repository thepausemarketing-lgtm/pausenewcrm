import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'majqfsudcpdgatygdoat.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Compress responses
  compress: true,

  // Strip console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
}

export default nextConfig

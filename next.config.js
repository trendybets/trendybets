const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.opticodds.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.nba.com',
        pathname: '/headshots/**',
      },
      {
        protocol: 'https',
        hostname: 'ak-static.cms.nba.com',
        pathname: '/wp-content/uploads/headshots/**',
      },
      {
        protocol: 'https',
        hostname: '*.nba.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
        pathname: '**',
      },
    ],
    domains: ['hvegilvwwvdmivnphlyo.supabase.co', 'cdn.opticodds.com'],
  },
}

module.exports = withBundleAnalyzer(nextConfig) 
/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
}

module.exports = nextConfig 
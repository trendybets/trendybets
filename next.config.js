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
    ],
    unoptimized: process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true',
  },
  // Configure for GitHub Pages deployment
  output: process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true' ? 'export' : undefined,
  // Set the base path for GitHub Pages
  basePath: process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true' ? '/trendybets' : '',
  // Disable image optimization for static export
  distDir: process.env.NEXT_PUBLIC_GITHUB_PAGES === 'true' ? 'out' : '.next',
}

module.exports = nextConfig 
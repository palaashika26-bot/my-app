import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  productionBrowserSourceMaps: true,
  distDir: process.env.DIST_DIR || '.next',

  allowedDevOrigins: [
    'china-india-b2b.preview.emergentagent.com',
    'china-india-b2b.cluster-2.preview.emergentcf.cloud',
    '*.preview.emergentagent.com',
    '*.preview.emergentcf.cloud',
    '*.trycloudflare.com',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: imageHosts,
    domains: ['localhost'],
    minimumCacheTTL: 60,
    qualities: [75, 85],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
    ];
  },
};
export default nextConfig;
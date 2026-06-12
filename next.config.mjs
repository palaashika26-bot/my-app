import { imageHosts } from './image-hosts.config.mjs';
import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
  distDir: process.env.DIST_DIR || '.next',

  allowedDevOrigins: [
    'china-india-b2b.preview.emergentagent.com',
    'china-india-b2b.cluster-2.preview.emergentcf.cloud',
    '*.preview.emergentagent.com',
    '*.preview.emergentcf.cloud',
    '*.trycloudflare.com',
  ],

  typescript: {
    // Type errors now fail the build (codebase is clean at 0 errors).
    ignoreBuildErrors: false,
  },

  eslint: {
    // Still ignored: ESLint reports ~6,900 mostly-formatting errors and the lint
    // setup needs migrating to flat config first. Re-enable after a lint cleanup pass.
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      ...imageHosts,
      { protocol: 'http', hostname: 'localhost', port: '3000' },
      { protocol: 'http', hostname: 'localhost', port: '4000' },
    ],
    minimumCacheTTL: 86400,
    qualities: [75, 85],
  },

  async headers() {
    return [
      {
        // API responses must never be cached — they contain live data
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
        ],
      },
      {
        // Static Next.js assets are already content-hashed; cache them aggressively
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

// Bundle analyzer — run `ANALYZE=true npm run build` to open the HTML report.
// No-op when ANALYZE env var is unset, so there is zero production impact.
const withAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });
export default withAnalyzer(nextConfig);
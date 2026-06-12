import { imageHosts } from './image-hosts.config.mjs';

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
// Uses a try/require so the build never fails on Vercel when devDependencies
// are not installed. The import() equivalent is synchronous here via createRequire.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let exportedConfig = nextConfig;
if (process.env.ANALYZE === 'true') {
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    exportedConfig = withBundleAnalyzer(nextConfig);
  } catch {
    console.warn('[next.config] @next/bundle-analyzer not found — skipping. Run npm install to enable.');
  }
}

export default exportedConfig;
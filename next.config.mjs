import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  distDir: process.env.DIST_DIR || '.next',

  // Allow dev resources (HMR, RSC) to be loaded from the preview proxy domain
  allowedDevOrigins: [
    'china-india-b2b.preview.emergentagent.com',
    'china-india-b2b.cluster-2.preview.emergentcf.cloud',
    '*.preview.emergentagent.com',
    '*.preview.emergentcf.cloud',
  ],

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
  }
};
export default nextConfig;
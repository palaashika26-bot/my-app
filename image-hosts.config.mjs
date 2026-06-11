/**
 * Image Hosts Configuration (add your image hosts here)
 */

export const imageHosts = [
    {
        protocol: 'https',
        hostname: 'images.unsplash.com',
    },
    {
        protocol: 'https',
        hostname: 'images.pexels.com',
    },
    {
        protocol: 'https',
        hostname: 'images.pixabay.com',
    },
    {
        protocol: 'https',
        hostname: 'img.rocket.new',
    },
    // Supabase Storage signed read URLs (catalog / request / payment images).
    // Wildcard covers any project ref subdomain on the .co and .in domains so
    // next/image is allowed to optimize them instead of rejecting the host.
    {
        protocol: 'https',
        hostname: '**.supabase.co',
    },
    {
        protocol: 'https',
        hostname: '**.supabase.in',
    },
];

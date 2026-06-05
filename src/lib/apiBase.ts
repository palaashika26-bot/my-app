// Centralised resolver for the Express API base URL.
//
// The value comes from NEXT_PUBLIC_API_URL. In development we fall back to the
// local backend for convenience, but in production there is deliberately NO
// localhost fallback — a missing value throws so a misconfigured deployment
// fails loudly instead of silently calling localhost.
const DEV_FALLBACK_API_URL = 'http://localhost:4000/api/v1';

export function resolveApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && url.trim()) return url.trim();

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Configure it in your Vercel project environment variables.'
    );
  }

  return DEV_FALLBACK_API_URL;
}

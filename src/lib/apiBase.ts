// Centralised resolver for the Express API base URL.
//
// The value comes from NEXT_PUBLIC_API_URL. In development we fall back to the
// local backend for convenience, but in production there is deliberately NO
// localhost fallback — a missing value throws so a misconfigured deployment
// fails loudly instead of silently calling localhost.
const DEV_FALLBACK_API_URL = 'http://localhost:4000/api/v1';

export function resolveApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url && url.trim()) {
    const trimmed = url.trim();
    // Guard against a recurring misconfiguration: NEXT_PUBLIC_API_URL accidentally
    // pointed at the Supabase project URL (which belongs in NEXT_PUBLIC_SUPABASE_URL,
    // for Storage only). Auth and data requests must go through the Express backend,
    // never directly to Supabase — fail loudly with a specific message instead of
    // surfacing as an opaque CORS error against *.supabase.co.
    if (/\bsupabase\.(co|in)\b/i.test(trimmed)) {
      throw new Error(
        `NEXT_PUBLIC_API_URL is pointing at a Supabase URL (${trimmed}). It must be the ` +
          `Express backend base, e.g. https://elios-server.onrender.com/api/v1. The Supabase ` +
          `project URL belongs in NEXT_PUBLIC_SUPABASE_URL (Storage uploads only).`
      );
    }
    return trimmed;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_API_URL is not set. Configure it in your Vercel project environment variables.'
    );
  }

  return DEV_FALLBACK_API_URL;
}

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser Supabase client used ONLY for direct uploads to Storage via short-lived
// signed upload URLs (uploadToSignedUrl). The anon key is public-safe; an upload is
// authorized by the per-file token issued by our backend (/uploads/sign), not by
// this key. No session is persisted.
let _client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getBrowserSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Image uploads are unavailable: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  if (!_client) {
    _client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

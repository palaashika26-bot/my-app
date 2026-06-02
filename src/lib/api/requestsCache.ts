import type { ApiResponse } from '../types/api.types';

type CacheEntry = { data: unknown; timestamp: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export const requestsCache = {
  get<T>(id: string): T | null {
    const entry = cache.get(id);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(id);
      return null;
    }
    return entry.data as T;
  },

  set(id: string, data: unknown) {
    cache.set(id, { data, timestamp: Date.now() });
  },

  setList(requests: { id: string }[]) {
    for (const r of requests) {
      if (r.id) cache.set(r.id, { data: r, timestamp: Date.now() });
    }
  },

  clear() {
    cache.clear();
  },
};

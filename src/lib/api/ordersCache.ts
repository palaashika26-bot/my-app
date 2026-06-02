// Simple in-memory cache for order data — enables instant navigation from list to detail

type CacheEntry = { data: unknown; timestamp: number };
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export const ordersCache = {
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

  setList(orders: { id: string }[]) {
    for (const o of orders) {
      if (o.id) cache.set(o.id, { data: o, timestamp: Date.now() });
    }
  },

  clear() {
    cache.clear();
  },
};

/**
 * ordersStore — single source of truth for client orders.
 *
 * Currently backed by localStorage (seeded from mockOrders on first load).
 * To connect a real database, replace `fetchOrders` with an API call:
 *   export async function fetchOrders(): Promise<OrderRow[]> {
 *     const res = await fetch('/api/orders');
 *     return res.json();
 *   }
 * Then swap every `getOrders()` call site to `await fetchOrders()`.
 */

import { mockOrders } from '@/lib/mockData';

export type OrderRow = (typeof mockOrders)[number];

const STORAGE_KEY = 'bk-orders';

/** Returns all orders. Falls back to mockOrders if localStorage is empty. */
export function getOrders(): OrderRow[] {
  if (typeof window === 'undefined') return mockOrders;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OrderRow[];
  } catch {}
  // First load: seed localStorage so all pages share one source
  seedOrders(mockOrders);
  return mockOrders;
}

/** Persists the given orders array to localStorage. */
export function setOrders(orders: OrderRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}

/** Seeds localStorage only if the key doesn't exist yet. */
export function seedOrders(orders: OrderRow[]): void {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    }
  } catch {}
}

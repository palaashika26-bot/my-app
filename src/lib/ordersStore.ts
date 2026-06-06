export interface OrderRow {
  id: string;
  orderId: string;
  date: string;
  amount: string;
  amountCny: string;
  itemCount: number;
  status: any;
  estimatedDelivery: string;
  client?: string;
  itemNames?: string;
  lineItems?: { id: string; name: string; quantity: number }[];
}

const STORAGE_KEY = 'bk-orders';

export function getOrders(): OrderRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OrderRow[];
  } catch {}
  return [];
}

export function setOrders(orders: OrderRow[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {}
}